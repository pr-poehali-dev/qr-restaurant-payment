import json
import os
import psycopg2
from psycopg2.extras import RealDictCursor

def handler(event, context):
    '''
    Business: Заполнение БД тестовыми данными для демо
    Args: event - dict с httpMethod
          context - объект с атрибутами: request_id
    Returns: HTTP response dict
    '''
    method = event.get('httpMethod', 'GET')
    
    if method == 'OPTIONS':
        return {
            'statusCode': 200,
            'headers': {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'POST, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type',
                'Access-Control-Max-Age': '86400'
            },
            'body': '',
            'isBase64Encoded': False
        }
    
    if method != 'POST':
        return {
            'statusCode': 405,
            'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
            'body': json.dumps({'error': 'Method not allowed'}),
            'isBase64Encoded': False
        }
    
    conn = psycopg2.connect(os.environ['DATABASE_URL'])
    
    try:
        with conn.cursor(cursor_factory=RealDictCursor) as cur:
            cur.execute("SELECT COUNT(*) as count FROM bills")
            bill_count = cur.fetchone()['count']
            
            if bill_count > 0:
                return {
                    'statusCode': 200,
                    'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                    'body': json.dumps({'message': 'Database already seeded'}),
                    'isBase64Encoded': False
                }
            
            cur.execute(
                "INSERT INTO bills (restaurant_name, table_number, total_amount, status) VALUES (%s, %s, %s, %s) RETURNING id",
                ('Ресторан Bella Vista', '12', 8440, 'active')
            )
            bill_id = cur.fetchone()['id']
            
            items = [
                ('Стейк рибай', 2800, 1),
                ('Салат Цезарь', 650, 2),
                ('Паста карбонара', 890, 1),
                ('Том Ям', 750, 1),
                ('Тирамису', 480, 2),
                ('Капучино', 280, 3)
            ]
            
            for name, price, quantity in items:
                cur.execute(
                    "INSERT INTO bill_items (bill_id, name, price, quantity) VALUES (%s, %s, %s, %s)",
                    (bill_id, name, price, quantity)
                )
            
            conn.commit()
            
            return {
                'statusCode': 200,
                'headers': {'Content-Type': 'application/json', 'Access-Control-Allow-Origin': '*'},
                'body': json.dumps({'message': 'Database seeded successfully', 'bill_id': bill_id}),
                'isBase64Encoded': False
            }
    
    finally:
        conn.close()
