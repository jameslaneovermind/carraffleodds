-- Activate BOTB site and configure affiliate settings
UPDATE sites
SET
  active = true,
  has_affiliate = true,
  url = 'https://www.botb.com',
  updated_at = NOW()
WHERE slug = 'botb';
