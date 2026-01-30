-- Helper function to get current user's organization
CREATE OR REPLACE FUNCTION auth.get_user_organization_id()
RETURNS UUID AS $$
  SELECT organization_id FROM users WHERE supabase_user_id = auth.uid()
$$ LANGUAGE sql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE members ENABLE ROW LEVEL SECURITY;
ALTER TABLE departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievances ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievance_steps ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievance_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievance_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE message_reads ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE member_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE contracts ENABLE ROW LEVEL SECURITY;
ALTER TABLE contract_articles ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievance_contract_violations ENABLE ROW LEVEL SECURITY;
ALTER TABLE grievance_relations ENABLE ROW LEVEL SECURITY;
ALTER TABLE custom_fields ENABLE ROW LEVEL SECURITY;
ALTER TABLE step_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE pdf_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE system_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_notifications ENABLE ROW LEVEL SECURITY;

-- Organizations policies
CREATE POLICY "Users can view their own organization"
  ON organizations FOR SELECT
  USING (id = auth.get_user_organization_id());

CREATE POLICY "Admins can update their organization"
  ON organizations FOR UPDATE
  USING (
    id = auth.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE supabase_user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Users policies
CREATE POLICY "Users can view users in their organization"
  ON users FOR SELECT
  USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Users can update their own profile"
  ON users FOR UPDATE
  USING (supabase_user_id = auth.uid());

CREATE POLICY "Admins can manage users in their organization"
  ON users FOR ALL
  USING (
    organization_id = auth.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE supabase_user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Members policies
CREATE POLICY "Users can view members in their organization"
  ON members FOR SELECT
  USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Users can insert members in their organization"
  ON members FOR INSERT
  WITH CHECK (organization_id = auth.get_user_organization_id());

CREATE POLICY "Users can update members in their organization"
  ON members FOR UPDATE
  USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Admins can delete members in their organization"
  ON members FOR DELETE
  USING (
    organization_id = auth.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE supabase_user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Grievances policies
CREATE POLICY "Users can view grievances in their organization"
  ON grievances FOR SELECT
  USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Users can insert grievances in their organization"
  ON grievances FOR INSERT
  WITH CHECK (organization_id = auth.get_user_organization_id());

CREATE POLICY "Users can update grievances in their organization"
  ON grievances FOR UPDATE
  USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Admins can delete grievances in their organization"
  ON grievances FOR DELETE
  USING (
    organization_id = auth.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE supabase_user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Departments policies
CREATE POLICY "Users can view departments in their organization"
  ON departments FOR SELECT
  USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Admins can manage departments"
  ON departments FOR ALL
  USING (
    organization_id = auth.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE supabase_user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Grievance steps policies
CREATE POLICY "Users can view grievance steps"
  ON grievance_steps FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM grievances g
      WHERE g.id = grievance_id
      AND g.organization_id = auth.get_user_organization_id()
    )
  );

CREATE POLICY "Users can manage grievance steps"
  ON grievance_steps FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM grievances g
      WHERE g.id = grievance_id
      AND g.organization_id = auth.get_user_organization_id()
    )
  );

-- Grievance notes policies
CREATE POLICY "Users can view grievance notes"
  ON grievance_notes FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM grievances g
      WHERE g.id = grievance_id
      AND g.organization_id = auth.get_user_organization_id()
    )
  );

CREATE POLICY "Users can insert grievance notes"
  ON grievance_notes FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grievances g
      WHERE g.id = grievance_id
      AND g.organization_id = auth.get_user_organization_id()
    )
  );

-- Grievance messages policies
CREATE POLICY "Users can view grievance messages"
  ON grievance_messages FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM grievances g
      WHERE g.id = grievance_id
      AND g.organization_id = auth.get_user_organization_id()
    )
  );

CREATE POLICY "Users can insert grievance messages"
  ON grievance_messages FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grievances g
      WHERE g.id = grievance_id
      AND g.organization_id = auth.get_user_organization_id()
    )
  );

-- Documents policies
CREATE POLICY "Users can view documents"
  ON documents FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM grievances g
      WHERE g.id = grievance_id
      AND g.organization_id = auth.get_user_organization_id()
    )
  );

CREATE POLICY "Users can insert documents"
  ON documents FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM grievances g
      WHERE g.id = grievance_id
      AND g.organization_id = auth.get_user_organization_id()
    )
  );

-- Contracts policies
CREATE POLICY "Users can view contracts in their organization"
  ON contracts FOR SELECT
  USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Admins can manage contracts"
  ON contracts FOR ALL
  USING (
    organization_id = auth.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE supabase_user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Contract articles policies
CREATE POLICY "Users can view contract articles"
  ON contract_articles FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_id
      AND c.organization_id = auth.get_user_organization_id()
    )
  );

CREATE POLICY "Admins can manage contract articles"
  ON contract_articles FOR ALL
  USING (
    EXISTS (
      SELECT 1 FROM contracts c
      WHERE c.id = contract_id
      AND c.organization_id = auth.get_user_organization_id()
      AND EXISTS (
        SELECT 1 FROM users
        WHERE supabase_user_id = auth.uid()
        AND role = 'ADMIN'
      )
    )
  );

-- Step templates policies
CREATE POLICY "Users can view step templates in their organization"
  ON step_templates FOR SELECT
  USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Admins can manage step templates"
  ON step_templates FOR ALL
  USING (
    organization_id = auth.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE supabase_user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Custom fields policies
CREATE POLICY "Users can view custom fields in their organization"
  ON custom_fields FOR SELECT
  USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Admins can manage custom fields"
  ON custom_fields FOR ALL
  USING (
    organization_id = auth.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE supabase_user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- PDF templates policies
CREATE POLICY "Users can view PDF templates in their organization"
  ON pdf_templates FOR SELECT
  USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Admins can manage PDF templates"
  ON pdf_templates FOR ALL
  USING (
    organization_id = auth.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE supabase_user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- Email templates policies
CREATE POLICY "Users can view email templates in their organization"
  ON email_templates FOR SELECT
  USING (organization_id = auth.get_user_organization_id());

CREATE POLICY "Admins can manage email templates"
  ON email_templates FOR ALL
  USING (
    organization_id = auth.get_user_organization_id()
    AND EXISTS (
      SELECT 1 FROM users
      WHERE supabase_user_id = auth.uid()
      AND role = 'ADMIN'
    )
  );

-- User notifications policies
CREATE POLICY "Users can view their own notifications"
  ON user_notifications FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = user_id
      AND supabase_user_id = auth.uid()
    )
  );

CREATE POLICY "Users can update their own notifications"
  ON user_notifications FOR UPDATE
  USING (
    EXISTS (
      SELECT 1 FROM users
      WHERE id = user_id
      AND supabase_user_id = auth.uid()
    )
  );

-- Audit logs policies (read-only for all users in organization)
CREATE POLICY "Users can view audit logs in their organization"
  ON audit_logs FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM users u
      WHERE u.id = user_id
      AND u.organization_id = auth.get_user_organization_id()
    )
  );
