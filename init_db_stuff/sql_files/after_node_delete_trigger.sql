CREATE TRIGGER after_node_delete_trigger
AFTER DELETE
ON node_registration_table
FOR EACH ROW
EXECUTE PROCEDURE after_node_delete();