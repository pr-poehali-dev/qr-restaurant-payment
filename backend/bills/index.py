import json
import os
from datetime import datetime, timedelta
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event, context):
    '''
    Business: Управление счетами ресторана и блокировка блюд
    Args: event - dict с httpMethod, body, queryStringParameters
          context - объект с атрибутами: request_id, function_name
    Returns: HTTP response dict
    '''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, POST, PUT, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, X-Session-Id',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    
    try:
        if method == 'GET':
            bill_id = event.get('queryStringParameters', {}).get('bill_id')
            session_id = event.get('headers', {}).get('x-session-id', '')
            
            if not bill_id:
                return {
                    'statusCode': 400,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'error': 'bill_id is required'}),
                    'isBase64Encoded': False
                }
            
            with conn.cursor(cursor_factory=RealDictCursor) as cur:
                cur.execute(
                    "SELECT * FROM bills WHERE id = %s AND status = 'active'",
                    (bill_id,)
                )
                bill = cur.fetchone()
                
                if not bill:
                    return {
                        'statusCode': 404,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Bill not found'}),
                        'isBase64Encoded': False
                    }
                
                cur.execute(
                    '''SELECT id, name, price, quantity, locked_by_session, locked_at, paid_amount 
                       FROM bill_items WHERE bill_id = %s''',
                    (bill_id,)
                )
                items = cur.fetchall()
                
                now = datetime.now()
                items_with_status = []
                
                for item in items:
                    item_dict = dict(item)
                    
                    if item['locked_by_session'] and item['locked_at']:
                        lock_age = now - item['locked_at']
                        if lock_age > timedelta(minutes=5):
                            cur.execute(
                                "UPDATE bill_items SET locked_by_session = NULL, locked_at = NULL WHERE id = %s",
                                (item['id'],)
                            )
                            conn.commit()
                            item_dict['locked_by_session'] = None
                            item_dict['is_locked'] = False
                        else:
                            item_dict['is_locked'] = item['locked_by_session'] != session_id
                    else:
                        item_dict['is_locked'] = False
                    
                    item_dict['remaining_amount'] = (item['price'] * item['quantity']) - item['paid_amount']
                    items_with_status.append(item_dict)
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({
                        'bill': dict(bill),
                        'items': items_with_status
                    }, default=str),
                    'isBase64Encoded': False
                }
        
        elif method == 'POST':
            body_data = json.loads(event.get('body', '{}'))
            action = body_data.get('action')
            
            if action == 'lock_items':
                bill_id = body_data.get('bill_id')
                item_ids = body_data.get('item_ids', [])
                session_id = event.get('headers', {}).get('x-session-id', '')
                
                if not session_id:
                    return {
                        'statusCode': 400,
                        'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                        'body': json.dumps({'error': 'Session ID required'}),
                        'isBase64Encoded': False
                    }
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    for item_id in item_ids:
                        cur.execute(
                            '''UPDATE bill_items 
                               SET locked_by_session = %s, locked_at = %s 
                               WHERE id = %s AND bill_id = %s 
                               AND (locked_by_session IS NULL OR locked_by_session = %s)''',
                            (session_id, datetime.now(), item_id, bill_id, session_id)
                        )
                    conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            
            elif action == 'unlock_items':
                item_ids = body_data.get('item_ids', [])
                session_id = event.get('headers', {}).get('x-session-id', '')
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    for item_id in item_ids:
                        cur.execute(
                            '''UPDATE bill_items 
                               SET locked_by_session = NULL, locked_at = NULL 
                               WHERE id = %s AND locked_by_session = %s''',
                            (item_id, session_id)
                        )
                    conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True}),
                    'isBase64Encoded': False
                }
            
            elif action == 'create_payment':
                bill_id = body_data.get('bill_id')
                session_id = event.get('headers', {}).get('x-session-id', '')
                amount = body_data.get('amount')
                tip_amount = body_data.get('tip_amount', 0)
                email = body_data.get('email')
                items = body_data.get('items', [])
                
                with conn.cursor(cursor_factory=RealDictCursor) as cur:
                    cur.execute(
                        '''INSERT INTO payments (bill_id, session_id, amount, tip_amount, email, status)
                           VALUES (%s, %s, %s, %s, %s, 'completed') RETURNING id''',
                        (bill_id, session_id, amount, tip_amount, email)
                    )
                    payment_id = cur.fetchone()['id']
                    
                    for item in items:
                        cur.execute(
                            '''INSERT INTO payment_items (payment_id, bill_item_id, amount)
                               VALUES (%s, %s, %s)''',
                            (payment_id, item['bill_item_id'], item['amount'])
                        )
                        
                        cur.execute(
                            '''UPDATE bill_items 
                               SET paid_amount = paid_amount + %s,
                                   locked_by_session = NULL,
                                   locked_at = NULL
                               WHERE id = %s''',
                            (item['amount'], item['bill_item_id'])
                        )
                    
                    conn.commit()
                
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'success': True, 'payment_id': payment_id}),
                    'isBase64Encoded': False
                }
        
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    finally:
        conn.close()
