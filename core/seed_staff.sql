-- Owners first. Add the rest of the team from the Staff and access screen once it exists,
-- or here with the same shape. Roles: owner, manager, reception, trainer, coach.
-- list_order puts new trainers first for lead assignment.
INSERT OR IGNORE INTO staff(name, email, role, list_order) VALUES
  ('Taylor Blackler', 'taylor@m2club.co.nz', 'owner', 1),
  ('Tim Fox',         'tim@m2club.co.nz',    'owner', 2),
  ('Bekka Schulze',   'bekka@m2club.co.nz',  'manager', 3);
