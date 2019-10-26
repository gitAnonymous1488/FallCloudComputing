CREATE TRIGGER after_node_register_trigger
AFTER INSERT
ON node_registration_table
FOR EACH ROW
EXECUTE PROCEDURE after_node_register();