USE n8cupertino_db;

-- Requiere que exista la tabla role y el rol 'administrador'.

INSERT INTO `user` (username, email, password_hash, rol_id, is_active)
SELECT
  'Pablo',
  'pablo@codigomarketing.net',
  '$2y$12$Dj6E0tU6Ws4YQycmPLZ7Ne3HFoyeetuxtaXTWzxoVq3eSIkb5gxo6',
  r.id,
  1
FROM role r
WHERE r.nombre = 'administrador'
ON DUPLICATE KEY UPDATE
  username = VALUES(username),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  rol_id = VALUES(rol_id),
  is_active = 1;

INSERT INTO `user` (username, email, password_hash, rol_id, is_active)
SELECT
  'Andrea',
  'afabianabarrios@gmail.com',
  '$2y$12$Dj6E0tU6Ws4YQycmPLZ7Ne3HFoyeetuxtaXTWzxoVq3eSIkb5gxo6',
  r.id,
  1
FROM role r
WHERE r.nombre = 'administrador'
ON DUPLICATE KEY UPDATE
  username = VALUES(username),
  email = VALUES(email),
  password_hash = VALUES(password_hash),
  rol_id = VALUES(rol_id),
  is_active = 1;
