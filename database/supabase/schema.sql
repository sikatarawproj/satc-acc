-- Wholesale Sales Management & SOA System
-- Supabase PostgreSQL Schema Migration
-- Run this in the Supabase SQL Editor

-- Enable UUID extension if not already enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Accounts table
CREATE TABLE IF NOT EXISTS accounts (
    id BIGSERIAL PRIMARY KEY,
    username VARCHAR(80) NOT NULL UNIQUE,
    full_name VARCHAR(160) NOT NULL,
    role VARCHAR(40) NOT NULL DEFAULT 'Viewer',
    password_hash VARCHAR(255) NOT NULL,
    access_json JSONB NULL,
    department VARCHAR(120) NOT NULL DEFAULT 'Accounting',
    email VARCHAR(160) NOT NULL DEFAULT '',
    status VARCHAR(40) NOT NULL DEFAULT 'Active',
    notes TEXT NULL,
    force_password_change BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    created_by VARCHAR(160) NOT NULL DEFAULT 'System',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(160) NOT NULL DEFAULT 'System',
    last_login_at TIMESTAMPTZ NULL
);

CREATE INDEX IF NOT EXISTS idx_accounts_role ON accounts(role);
CREATE INDEX IF NOT EXISTS idx_accounts_status ON accounts(status);

-- Settings table (singleton)
CREATE TABLE IF NOT EXISTS settings (
    id SMALLINT PRIMARY KEY DEFAULT 1,
    payload_json JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(160) NOT NULL DEFAULT 'System'
);

-- Transactions table
CREATE TABLE IF NOT EXISTS transactions (
    id BIGSERIAL PRIMARY KEY,
    inv_no VARCHAR(80) NOT NULL UNIQUE,
    customer VARCHAR(190) NOT NULL DEFAULT '',
    invoice_date DATE NULL,
    due_date DATE NULL,
    status VARCHAR(40) NOT NULL DEFAULT 'NOTDUE',
    receivable DECIMAL(18,2) NOT NULL DEFAULT 0,
    payload_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_transactions_customer ON transactions(customer);
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_date ON transactions(invoice_date);
CREATE INDEX IF NOT EXISTS idx_transactions_due_date ON transactions(due_date);
CREATE INDEX IF NOT EXISTS idx_transactions_status ON transactions(status);
CREATE INDEX IF NOT EXISTS idx_transactions_receivable ON transactions(receivable);

-- Customers table
CREATE TABLE IF NOT EXISTS customers (
    id BIGSERIAL PRIMARY KEY,
    name VARCHAR(190) NOT NULL UNIQUE,
    payload_json JSONB NOT NULL DEFAULT '{}',
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_by VARCHAR(160) NOT NULL DEFAULT 'System'
);

CREATE INDEX IF NOT EXISTS idx_customers_name ON customers(name);

-- Audit log table
CREATE TABLE IF NOT EXISTS audit_log (
    id BIGSERIAL PRIMARY KEY,
    action VARCHAR(160) NOT NULL DEFAULT '',
    inv_no VARCHAR(80) NOT NULL DEFAULT '',
    customer VARCHAR(190) NOT NULL DEFAULT '',
    actor VARCHAR(190) NOT NULL DEFAULT '',
    detail TEXT NULL,
    before_json JSONB NULL,
    after_json JSONB NULL,
    fields_json JSONB NULL,
    entity_type VARCHAR(80) NOT NULL DEFAULT '',
    entity_id VARCHAR(80) NOT NULL DEFAULT '',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_action ON audit_log(action);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON audit_log(created_at);

-- Backups table
CREATE TABLE IF NOT EXISTS backups (
    id BIGSERIAL PRIMARY KEY,
    filename VARCHAR(255) NOT NULL,
    record_count INTEGER NOT NULL DEFAULT 0,
    overdue_count INTEGER NOT NULL DEFAULT 0,
    cancelled_count INTEGER NOT NULL DEFAULT 0,
    warning_text TEXT NULL,
    payload_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_backups_created_at ON backups(created_at);

-- Notifications table
CREATE TABLE IF NOT EXISTS notifications (
    id BIGSERIAL PRIMARY KEY,
    title VARCHAR(190) NOT NULL DEFAULT '',
    body TEXT NULL,
    level VARCHAR(40) NOT NULL DEFAULT 'info',
    read_at TIMESTAMPTZ NULL,
    payload_json JSONB NOT NULL DEFAULT '{}',
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_notifications_title ON notifications(title);
CREATE INDEX IF NOT EXISTS idx_notifications_read_at ON notifications(read_at);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- Insert default accounts (passwords via pbkdf2-sha512)
-- marco/President@123, admin/Admin@123, encoder/Encoder@123, reviewer/Reviewer@123, viewer/Viewer@123
INSERT INTO accounts (username, full_name, role, password_hash, access_json, department, email, status, notes, force_password_change, created_by, updated_by)
VALUES
    ('marco', 'Marco Qua', 'President', 'pbkdf2-sha512$100000$1df2776d77ca4bb60e09707c3e78099e$6d7f801ff9851a32d1ee90a2f056c87dcef3f93a15a74f59b16c63fecf14ea1f2e1a020a4c97f4d3d69da1c18f1ed40158d314ac6719ca69208b12b7dd03b2c1', '{"tabs":["summarySection","encodeSection","soaSection","agingSection","settingsSection","accountSection","auditSection"],"canEditSummary":true,"canEncode":true,"canCancel":true,"canExport":true,"canResetSample":true,"canAdminReset":true,"canResetOtherPasswords":true}', 'Management', '', 'Active', '', true, 'System', 'System'),
    ('admin', 'Office Admin', 'Admin', 'pbkdf2-sha512$100000$647876f1ad4a5d164de5552b69201ffb$77b1eb982102fe638c64288f81b7c30350a4732414aeeaab8fa62f724387a7e428c725f25fec3e8ff0fcca24b78672b57355c779fbb29d96dc9a764e5e6e5a88', '{"tabs":["summarySection","encodeSection","soaSection","agingSection","settingsSection","accountSection"],"canEditSummary":true,"canEncode":true,"canCancel":true,"canExport":true,"canResetSample":true,"canAdminReset":true,"canResetOtherPasswords":true}', 'Accounting', '', 'Active', '', true, 'System', 'System'),
    ('encoder', 'Office Encoder', 'Encoder', 'pbkdf2-sha512$100000$118771bf7fbf3ae79d483da668c6e379$415dc3e0873a8b665ecc3c18b9a5105cca2c442ab5e22ac54c2a05aed42b4bb8ff4d758e0883acf2a4077f17c4772b0395462cc8aaad04feabbe59f00d56e855', '{"tabs":["summarySection","encodeSection","soaSection","agingSection"],"canEditSummary":true,"canEncode":true,"canCancel":false,"canExport":true,"canResetSample":false,"canAdminReset":false,"canResetOtherPasswords":false}', 'Accounting', '', 'Active', '', true, 'System', 'System'),
    ('reviewer', 'Office Reviewer', 'Reviewer', 'pbkdf2-sha512$100000$3e324e0752ec2b2b2c3a8a29eeace262$ce3bce355e9b4afb6ec35dc3bc7d8b62f4b8717ed6ac1f7aa721c4b70c21f0104ca34c9072294b1e1fa9c86c179c327769bc8710845cbfb8504eb045e95da35f', '{"tabs":["summarySection","soaSection","agingSection"],"canEditSummary":false,"canEncode":false,"canCancel":true,"canExport":true,"canResetSample":false,"canAdminReset":false,"canResetOtherPasswords":false}', 'Accounting', '', 'Active', '', true, 'System', 'System'),
    ('viewer', 'Office Viewer', 'Viewer', 'pbkdf2-sha512$100000$1ee5c5981c4e276db72aeba15cb159f2$f6f183f40b2e19ffeae193b56591130747110ef8f6ab19436324a622da30557fca76451794d5cc60e543e95f2ea4f794c461aed8a183452a7b70f276e6385022', '{"tabs":["summarySection","soaSection","agingSection"],"canEditSummary":false,"canEncode":false,"canCancel":false,"canExport":true,"canResetSample":false,"canAdminReset":false,"canResetOtherPasswords":false}', 'Accounting', '', 'Active', '', true, 'System', 'System')
ON CONFLICT (username) DO NOTHING;

-- Insert default settings
INSERT INTO settings (id, payload_json, updated_by)
VALUES (1, '{"companyName":"Sikat Araw Trading Corp.","companyAddress":"Rm. 1115 State Center Bldg. 333 Juan Luna St., Binondo Manila","companyEmail":"cold_storage888@yahoo.com","companyPhone":"02-824-2551 to 18","defaultDocType":"DR","defaultPaymentTerms":"30","defaultStatus":"NOTDUE","defaultModePayment":"B2B thru BDO","defaultPreparedBy":"Accounting","defaultApprovedBy":"Manager"}', 'System')
ON CONFLICT (id) DO NOTHING;
