-- Provision Department Logins & Role Permissions
-- Profiles: CR BOOKING, AUDIT, CUSTOMER SERVICE, Changes
-- Default password: Password@123

DO $$
DECLARE
    v_cr_booking_role_id UUID;
    v_auditor_role_id UUID;
    v_cs_role_id UUID;
    v_change_dep_role_id UUID;
    v_view_all_perm_id UUID;
    v_pwd_hash TEXT := '$2b$12$GILtWj1oQVXkmUb5TK1keOG7GBIOkiVXxTPvK1QupQsGSGoI3vhzO';
BEGIN
    -- 1. Get or create Roles
    SELECT id INTO v_cr_booking_role_id FROM roles WHERE name = 'cr_booking';
    IF v_cr_booking_role_id IS NULL THEN
        INSERT INTO roles (id, name, is_system_role, created_at, updated_at)
        VALUES (gen_random_uuid(), 'cr_booking', true, NOW(), NOW())
        RETURNING id INTO v_cr_booking_role_id;
    END IF;

    SELECT id INTO v_auditor_role_id FROM roles WHERE name = 'auditor';
    IF v_auditor_role_id IS NULL THEN
        INSERT INTO roles (id, name, is_system_role, created_at, updated_at)
        VALUES (gen_random_uuid(), 'auditor', true, NOW(), NOW())
        RETURNING id INTO v_auditor_role_id;
    END IF;

    SELECT id INTO v_cs_role_id FROM roles WHERE name = 'cs';
    IF v_cs_role_id IS NULL THEN
        INSERT INTO roles (id, name, is_system_role, created_at, updated_at)
        VALUES (gen_random_uuid(), 'cs', true, NOW(), NOW())
        RETURNING id INTO v_cs_role_id;
    END IF;

    SELECT id INTO v_change_dep_role_id FROM roles WHERE name = 'change_dep';
    IF v_change_dep_role_id IS NULL THEN
        INSERT INTO roles (id, name, is_system_role, created_at, updated_at)
        VALUES (gen_random_uuid(), 'change_dep', true, NOW(), NOW())
        RETURNING id INTO v_change_dep_role_id;
    END IF;

    -- 2. Grant leads.view_all permission to cs, cr_booking, change_dep
    SELECT id INTO v_view_all_perm_id FROM permissions WHERE code = 'leads.view_all';
    IF v_view_all_perm_id IS NOT NULL THEN
        INSERT INTO role_permissions (role_id, permission_id)
        VALUES 
            (v_cs_role_id, v_view_all_perm_id),
            (v_cr_booking_role_id, v_view_all_perm_id),
            (v_change_dep_role_id, v_view_all_perm_id)
        ON CONFLICT DO NOTHING;
    END IF;

    -- 3. Upsert User: CR BOOKING (crbooking@crm.local)
    IF EXISTS (SELECT 1 FROM users WHERE email = 'crbooking@crm.local') THEN
        UPDATE users SET 
            password_hash = v_pwd_hash,
            role_id = v_cr_booking_role_id,
            name = 'CR Booking Specialist',
            is_active = true,
            updated_at = NOW()
        WHERE email = 'crbooking@crm.local';
    ELSE
        INSERT INTO users (id, name, email, password_hash, role_id, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), 'CR Booking Specialist', 'crbooking@crm.local', v_pwd_hash, v_cr_booking_role_id, true, NOW(), NOW());
    END IF;

    -- 4. Upsert User: AUDIT (audit@crm.local)
    IF EXISTS (SELECT 1 FROM users WHERE email = 'audit@crm.local') THEN
        UPDATE users SET 
            password_hash = v_pwd_hash,
            role_id = v_auditor_role_id,
            name = 'Audit Specialist',
            is_active = true,
            updated_at = NOW()
        WHERE email = 'audit@crm.local';
    ELSE
        INSERT INTO users (id, name, email, password_hash, role_id, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Audit Specialist', 'audit@crm.local', v_pwd_hash, v_auditor_role_id, true, NOW(), NOW());
    END IF;

    -- 5. Upsert User: CUSTOMER SERVICE (cs@crm.local)
    IF EXISTS (SELECT 1 FROM users WHERE email = 'cs@crm.local') THEN
        UPDATE users SET 
            password_hash = v_pwd_hash,
            role_id = v_cs_role_id,
            name = 'Customer Service Agent',
            is_active = true,
            updated_at = NOW()
        WHERE email = 'cs@crm.local';
    ELSE
        INSERT INTO users (id, name, email, password_hash, role_id, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Customer Service Agent', 'cs@crm.local', v_pwd_hash, v_cs_role_id, true, NOW(), NOW());
    END IF;

    -- 6. Upsert User: Changes (changes@crm.local)
    IF EXISTS (SELECT 1 FROM users WHERE email = 'changes@crm.local') THEN
        UPDATE users SET 
            password_hash = v_pwd_hash,
            role_id = v_change_dep_role_id,
            name = 'Changes Specialist',
            is_active = true,
            updated_at = NOW()
        WHERE email = 'changes@crm.local';
    ELSE
        INSERT INTO users (id, name, email, password_hash, role_id, is_active, created_at, updated_at)
        VALUES (gen_random_uuid(), 'Changes Specialist', 'changes@crm.local', v_pwd_hash, v_change_dep_role_id, true, NOW(), NOW());
    END IF;

    RAISE NOTICE 'Department logins provisioned successfully.';
END $$;
