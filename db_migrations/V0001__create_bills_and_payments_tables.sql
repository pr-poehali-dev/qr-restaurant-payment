CREATE TABLE bills (
    id SERIAL PRIMARY KEY,
    restaurant_name VARCHAR(255) NOT NULL,
    table_number VARCHAR(50),
    total_amount INTEGER NOT NULL,
    status VARCHAR(50) DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE bill_items (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id),
    name VARCHAR(255) NOT NULL,
    price INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    locked_by_session VARCHAR(255),
    locked_at TIMESTAMP,
    paid_amount INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    bill_id INTEGER REFERENCES bills(id),
    session_id VARCHAR(255) NOT NULL,
    amount INTEGER NOT NULL,
    tip_amount INTEGER DEFAULT 0,
    email VARCHAR(255),
    status VARCHAR(50) DEFAULT 'pending',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE payment_items (
    id SERIAL PRIMARY KEY,
    payment_id INTEGER REFERENCES payments(id),
    bill_item_id INTEGER REFERENCES bill_items(id),
    amount INTEGER NOT NULL
);

CREATE INDEX idx_bills_status ON bills(status);
CREATE INDEX idx_bill_items_bill_id ON bill_items(bill_id);
CREATE INDEX idx_bill_items_locked ON bill_items(locked_by_session);
CREATE INDEX idx_payments_bill_id ON payments(bill_id);
