-- Missing primary key and missing indexes
CREATE TABLE audit_logs (
    event_name VARCHAR(100),
    payload TEXT,
    created_at TIMESTAMP
);
