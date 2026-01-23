-- Create wiki_templates table for article templates
CREATE TABLE public.wiki_templates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  content text NOT NULL,
  article_type text NOT NULL DEFAULT 'article',
  category_id uuid REFERENCES public.wiki_categories(id) ON DELETE SET NULL,
  created_by uuid,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.wiki_templates ENABLE ROW LEVEL SECURITY;

-- Admins can manage templates
CREATE POLICY "Admins can manage templates"
  ON public.wiki_templates FOR ALL
  USING (is_admin(auth.uid()))
  WITH CHECK (is_admin(auth.uid()));

-- Authenticated users can view active templates
CREATE POLICY "Authenticated users can view active templates"
  ON public.wiki_templates FOR SELECT
  USING (is_active = true);

-- Add trigger for updated_at
CREATE TRIGGER update_wiki_templates_updated_at
  BEFORE UPDATE ON public.wiki_templates
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();

-- Seed default templates
INSERT INTO public.wiki_templates (name, description, content, article_type) VALUES
(
  'Policy Template',
  'Standard format for company policies',
  '<h2>Purpose</h2>
<p>Describe the purpose of this policy and why it exists.</p>

<h2>Scope</h2>
<p>Define who this policy applies to (all employees, specific departments, contractors, etc.).</p>

<h2>Policy Statement</h2>
<p>State the main policy guidelines and expectations.</p>

<h2>Procedures</h2>
<ol>
<li>Step one of the procedure</li>
<li>Step two of the procedure</li>
<li>Step three of the procedure</li>
</ol>

<h2>Responsibilities</h2>
<ul>
<li><strong>Employees:</strong> Describe employee responsibilities</li>
<li><strong>Managers:</strong> Describe manager responsibilities</li>
<li><strong>HR:</strong> Describe HR responsibilities</li>
</ul>

<h2>Enforcement</h2>
<p>Describe how this policy will be enforced and consequences for non-compliance.</p>

<h2>Related Documents</h2>
<p>List any related policies, procedures, or external regulations.</p>',
  'policy'
),
(
  'Standard Operating Procedure (SOP)',
  'Step-by-step instructions for routine operations',
  '<h2>Objective</h2>
<p>State the objective of this procedure.</p>

<h2>Scope</h2>
<p>Define what this procedure covers and who should follow it.</p>

<h2>Responsibilities</h2>
<ul>
<li><strong>Role 1:</strong> Responsibilities</li>
<li><strong>Role 2:</strong> Responsibilities</li>
</ul>

<h2>Prerequisites</h2>
<ul>
<li>Prerequisite 1</li>
<li>Prerequisite 2</li>
</ul>

<h2>Procedure Steps</h2>
<ol>
<li><strong>Step 1:</strong> Description of step 1</li>
<li><strong>Step 2:</strong> Description of step 2</li>
<li><strong>Step 3:</strong> Description of step 3</li>
</ol>

<h2>Expected Outcome</h2>
<p>Describe what should happen when the procedure is completed successfully.</p>

<h2>Troubleshooting</h2>
<ul>
<li><strong>Issue:</strong> Solution</li>
</ul>

<h2>References</h2>
<p>List any reference documents or resources.</p>',
  'article'
),
(
  'FAQ Template',
  'Question and answer format for common questions',
  '<h2>Frequently Asked Questions</h2>

<h3>Question 1: What is [topic]?</h3>
<p>Answer to question 1 goes here.</p>

<h3>Question 2: How do I [action]?</h3>
<p>Answer to question 2 goes here.</p>

<h3>Question 3: When should I [action]?</h3>
<p>Answer to question 3 goes here.</p>

<h3>Question 4: Who do I contact for [topic]?</h3>
<p>Answer to question 4 goes here.</p>

<h2>Still Have Questions?</h2>
<p>Contact [department/person] at [email/phone] for additional assistance.</p>',
  'article'
),
(
  'How-To Guide',
  'Tutorial format for explaining how to do something',
  '<h2>Introduction</h2>
<p>Brief overview of what this guide will help you accomplish.</p>

<h2>Prerequisites</h2>
<ul>
<li>What you need before starting</li>
<li>Required access or permissions</li>
<li>Required tools or materials</li>
</ul>

<h2>Step-by-Step Instructions</h2>

<h3>Step 1: [Action]</h3>
<p>Detailed instructions for step 1.</p>

<h3>Step 2: [Action]</h3>
<p>Detailed instructions for step 2.</p>

<h3>Step 3: [Action]</h3>
<p>Detailed instructions for step 3.</p>

<h2>Tips & Best Practices</h2>
<ul>
<li>Tip 1</li>
<li>Tip 2</li>
</ul>

<h2>Troubleshooting</h2>
<p><strong>Problem:</strong> Description</p>
<p><strong>Solution:</strong> How to fix it</p>

<h2>Additional Resources</h2>
<p>Links to related guides or documentation.</p>',
  'article'
);