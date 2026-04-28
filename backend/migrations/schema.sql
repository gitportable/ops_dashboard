-- ============================================================
-- OpsDash — Operations Management Platform
-- Database Schema Migration
-- Version: 1.0.0
-- Generated: 2026
-- Client: Emmvee Solar
-- ============================================================
-- Run this file ONCE on a fresh PostgreSQL database:
-- psql -U your_user -d opsdash -f backend/migrations/schema.sql
-- ============================================================

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. dimdate
CREATE TABLE IF NOT EXISTS dimdate (
    date date NOT NULL PRIMARY KEY,
    year integer,
    monthnumber integer,
    monthname character varying(20),
    day integer
);

-- 2. users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email character varying(255) NOT NULL UNIQUE,
    password character varying(255) NOT NULL,
    role character varying(50) NOT NULL,
    status character varying(50),
    name text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 3. projects (legacy)
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    status character varying(50),
    budget numeric,
    spent numeric,
    start_date date,
    end_date date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 4. issues (legacy)
CREATE TABLE IF NOT EXISTS issues (
    id SERIAL PRIMARY KEY,
    title character varying(255) NOT NULL,
    status character varying(50),
    priority character varying(50),
    project_id integer,
    assigned_to integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 5. expanded_factprojects
CREATE TABLE IF NOT EXISTS expanded_factprojects (
    id SERIAL PRIMARY KEY,
    projectname character varying(255),
    status character varying(50),
    budgetallocated numeric,
    budgetused numeric,
    startdate date,
    enddate date,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    projectid text UNIQUE,
    budget_used numeric
);

-- 6. expanded_factissues
CREATE TABLE IF NOT EXISTS expanded_factissues (
    issueid text PRIMARY KEY,
    projectid text NOT NULL,
    sprint text,
    issuetype text,
    createddate timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    closeddate timestamp without time zone,
    assigneeteam text,
    description text,
    status text,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    machine_id integer,
    defect_category character varying(100),
    defect_location character varying(255),
    severity character varying(50),
    stage character varying(100)
);

-- 7. project_assignments
CREATE TABLE IF NOT EXISTS project_assignments (
    id SERIAL PRIMARY KEY,
    project_id text,
    user_id bigint,
    role character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 8. audit_logs
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGSERIAL PRIMARY KEY,
    user_id bigint,
    action text NOT NULL,
    target_id text,
    ip_address inet,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 9. change_requests
CREATE TABLE IF NOT EXISTS change_requests (
    id BIGSERIAL PRIMARY KEY,
    project_id text NOT NULL,
    requested_by bigint NOT NULL,
    field text NOT NULL,
    new_value text,
    reason text,
    status text,
    reviewed_by bigint,
    reviewed_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 10. subtasks
CREATE TABLE IF NOT EXISTS subtasks (
    id SERIAL PRIMARY KEY,
    issue_id character varying(50) NOT NULL,
    title character varying(500) NOT NULL,
    is_done boolean DEFAULT false,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 11. issue_attachments
CREATE TABLE IF NOT EXISTS issue_attachments (
    id SERIAL PRIMARY KEY,
    issue_id character varying(50) NOT NULL,
    file_name character varying(500) NOT NULL,
    file_path character varying(1000) NOT NULL,
    file_size integer,
    uploaded_by integer,
    uploaded_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 12. approval_requests
CREATE TABLE IF NOT EXISTS approval_requests (
    id SERIAL PRIMARY KEY,
    issue_id character varying(50) NOT NULL,
    requested_by integer,
    approver_id integer,
    status character varying(50),
    comments text,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp without time zone
);

-- 13. inspection_checklists
CREATE TABLE IF NOT EXISTS inspection_checklists (
    id SERIAL PRIMARY KEY,
    issue_id character varying(50) NOT NULL,
    item_text character varying(500) NOT NULL,
    is_checked boolean DEFAULT false,
    checked_by integer,
    checked_at timestamp without time zone,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 14. rca_reports
CREATE TABLE IF NOT EXISTS rca_reports (
    id SERIAL PRIMARY KEY,
    issue_id character varying(100) NOT NULL,
    problem_statement text,
    root_cause text,
    contributing_factors text,
    impact_assessment text,
    five_why_analysis jsonb,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 15. capa_items
CREATE TABLE IF NOT EXISTS capa_items (
    id SERIAL PRIMARY KEY,
    rca_id integer,
    issue_id character varying(100),
    action_type character varying(50),
    description text,
    assigned_to integer,
    due_date date,
    status character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- 16. workflow_templates
CREATE TABLE IF NOT EXISTS workflow_templates (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    description text,
    steps jsonb NOT NULL,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    workflow_type character varying(100),
    applicable_to character varying(100),
    sla_hours integer,
    is_active boolean DEFAULT true
);

-- 17. machines
CREATE TABLE IF NOT EXISTS machines (
    id SERIAL PRIMARY KEY,
    machine_code character varying(100) NOT NULL UNIQUE,
    machine_name character varying(255) NOT NULL,
    location character varying(255),
    machine_type character varying(100),
    status character varying(50),
    project_id character varying(100),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    manufacturer character varying(255),
    model_number character varying(100),
    serial_number character varying(100),
    capacity_per_hour numeric,
    power_consumption_kw numeric,
    purchase_date date,
    warranty_expiry date,
    last_maintenance_date date,
    next_maintenance_due date,
    maintenance_frequency_days integer,
    assigned_technician integer,
    production_stage character varying(100),
    efficiency_rating numeric,
    notes text
);

-- 18. batch_lots
CREATE TABLE IF NOT EXISTS batch_lots (
    id SERIAL PRIMARY KEY,
    lot_number character varying(100) NOT NULL UNIQUE,
    material_type character varying(100),
    quantity integer,
    supplier character varying(255),
    received_date date,
    qc_status character varying(50),
    notes text,
    project_id character varying(100),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    cell_efficiency numeric,
    power_rating_w numeric,
    storage_location character varying(100),
    rejection_count integer,
    rejection_reason text,
    certificate_number character varying(150)
);

-- 19. work_orders
CREATE TABLE IF NOT EXISTS work_orders (
    id SERIAL PRIMARY KEY,
    wo_number character varying(100) NOT NULL UNIQUE,
    batch_lot character varying(100),
    project_id character varying(100),
    stage character varying(100),
    status character varying(50),
    description text,
    assigned_to integer,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    updated_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    priority character varying(50),
    planned_start_date date,
    planned_end_date date,
    actual_start_date date,
    actual_end_date date,
    machine_id integer,
    supervisor character varying(255),
    team_size integer,
    target_units integer,
    completed_units integer,
    rejection_count integer,
    remarks text,
    shift character varying(50)
);

-- 20. wo_stage_history
CREATE TABLE IF NOT EXISTS wo_stage_history (
    id SERIAL PRIMARY KEY,
    wo_id integer,
    from_stage character varying(100),
    to_stage character varying(100) NOT NULL,
    changed_by integer,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notes text
);

-- 21. vendors
CREATE TABLE IF NOT EXISTS vendors (
    id SERIAL PRIMARY KEY,
    name character varying(255) NOT NULL,
    contact_email character varying(255),
    contact_phone character varying(50),
    material_supplied character varying(255),
    status character varying(50),
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    contact_name character varying(255),
    address text,
    notes text
);

-- 22. vendor_issues
CREATE TABLE IF NOT EXISTS vendor_issues (
    id SERIAL PRIMARY KEY,
    vendor_id integer,
    issue_type character varying(100),
    description text,
    severity character varying(50),
    status character varying(50),
    reported_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    impact_area character varying(100),
    quantity_affected integer,
    estimated_loss numeric,
    due_date date,
    resolution_notes text,
    resolved_at timestamp without time zone
);

-- 23. purchase_orders
CREATE TABLE IF NOT EXISTS purchase_orders (
    id SERIAL PRIMARY KEY,
    po_number character varying(100) NOT NULL UNIQUE,
    vendor_id integer,
    amount numeric,
    status character varying(50),
    expected_date date,
    project_id character varying(100),
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    gst_number character varying(50),
    invoice_number character varying(100),
    payment_terms character varying(100),
    delivery_address text,
    material_category character varying(100),
    quantity integer,
    unit_price numeric,
    tax_amount numeric,
    total_amount numeric,
    payment_status character varying(50),
    received_date date,
    quality_check_status character varying(50),
    remarks text
);

-- 24. po_status_history
CREATE TABLE IF NOT EXISTS po_status_history (
    id SERIAL PRIMARY KEY,
    po_id integer,
    from_status character varying(100),
    to_status character varying(100) NOT NULL,
    changed_by integer,
    changed_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    notes text
);

-- 25. field_tickets
CREATE TABLE IF NOT EXISTS field_tickets (
    id SERIAL PRIMARY KEY,
    ticket_type character varying(50) NOT NULL,
    site_name character varying(255),
    location text,
    description text,
    status character varying(50),
    priority character varying(50),
    assigned_to integer,
    project_id character varying(100),
    warranty_expiry date,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP,
    resolved_at timestamp without time zone,
    customer_name character varying(255),
    contact_number character varying(50),
    state character varying(100),
    city character varying(100),
    plant_capacity_kw numeric,
    resolution_notes text,
    sla_due_date date,
    escalation_level character varying(50),
    no_of_panels integer,
    inverter_model character varying(255),
    commissioning_date date,
    last_service_date date,
    next_service_due date,
    amc_contract_number character varying(100),
    claim_number character varying(100),
    component_failed character varying(255),
    failure_date date,
    replacement_approved boolean
);

-- 26. inventory_alert_rules
CREATE TABLE IF NOT EXISTS inventory_alert_rules (
    id SERIAL PRIMARY KEY,
    material_type character varying(100) NOT NULL,
    threshold_quantity integer NOT NULL,
    alert_level character varying(50),
    is_active boolean DEFAULT true,
    created_by integer,
    created_at timestamp without time zone DEFAULT CURRENT_TIMESTAMP
);

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_issues_projectid ON expanded_factissues(projectid);
CREATE INDEX IF NOT EXISTS idx_issues_status ON expanded_factissues(status);
CREATE INDEX IF NOT EXISTS idx_issues_assigneeteam ON expanded_factissues(assigneeteam);
CREATE INDEX IF NOT EXISTS idx_issues_sprint ON expanded_factissues(sprint);
CREATE INDEX IF NOT EXISTS idx_project_assignments_project ON project_assignments(project_id);
CREATE INDEX IF NOT EXISTS idx_project_assignments_user ON project_assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_user ON audit_logs(user_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON audit_logs(created_at);
CREATE INDEX IF NOT EXISTS idx_work_orders_project ON work_orders(project_id);
CREATE INDEX IF NOT EXISTS idx_work_orders_status ON work_orders(status);
CREATE INDEX IF NOT EXISTS idx_batch_lots_qc_status ON batch_lots(qc_status);
CREATE INDEX IF NOT EXISTS idx_field_tickets_status ON field_tickets(status);
CREATE INDEX IF NOT EXISTS idx_vendor_issues_vendor ON vendor_issues(vendor_id);
CREATE INDEX IF NOT EXISTS idx_purchase_orders_vendor ON purchase_orders(vendor_id);

-- Schema creation complete — 26 tables
