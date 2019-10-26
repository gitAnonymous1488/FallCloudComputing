CREATE TRIGGER after_node_process_trigger
AFTER INSERT
ON process_registration_table
FOR EACH ROW
EXECUTE PROCEDURE after_process_register();