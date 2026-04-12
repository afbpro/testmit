USE n8cupertino_db;

CREATE TABLE IF NOT EXISTS role (
  id TINYINT UNSIGNED NOT NULL AUTO_INCREMENT,
  nombre VARCHAR(50) NOT NULL,
  descripcion VARCHAR(150) NULL,
  created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  UNIQUE KEY uq_role_nombre (nombre)
) ENGINE=InnoDB;

INSERT INTO role (nombre, descripcion)
VALUES
  ('administrador', 'Acceso completo al sistema'),
  ('usuario', 'Acceso estandar al sistema')
ON DUPLICATE KEY UPDATE
  descripcion = VALUES(descripcion);

SET @column_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.COLUMNS
  WHERE TABLE_SCHEMA = 'n8cupertino_db'
    AND TABLE_NAME = 'user'
    AND COLUMN_NAME = 'rol_id'
);

SET @sql_add_column := IF(
  @column_exists = 0,
  'ALTER TABLE `user` ADD COLUMN rol_id TINYINT UNSIGNED NULL AFTER password_hash',
  'SELECT 1'
);

PREPARE stmt_add_column FROM @sql_add_column;
EXECUTE stmt_add_column;
DEALLOCATE PREPARE stmt_add_column;

UPDATE `user` u
JOIN role r ON r.nombre = 'usuario'
SET u.rol_id = r.id
WHERE u.rol_id IS NULL;

ALTER TABLE `user`
  MODIFY COLUMN rol_id TINYINT UNSIGNED NOT NULL;

SET @fk_exists := (
  SELECT COUNT(*)
  FROM INFORMATION_SCHEMA.REFERENTIAL_CONSTRAINTS
  WHERE CONSTRAINT_SCHEMA = 'n8cupertino_db'
    AND CONSTRAINT_NAME = 'fk_user_roles'
    AND TABLE_NAME = 'user'
);

SET @sql_add_fk := IF(
  @fk_exists = 0,
  'ALTER TABLE `user` ADD CONSTRAINT fk_user_roles FOREIGN KEY (rol_id) REFERENCES role(id) ON UPDATE RESTRICT ON DELETE RESTRICT',
  'SELECT 1'
);

PREPARE stmt_add_fk FROM @sql_add_fk;
EXECUTE stmt_add_fk;
DEALLOCATE PREPARE stmt_add_fk;
