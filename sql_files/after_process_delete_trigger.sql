CREATE TRIGGER after_process_delete_trigger
AFTER DELETE
ON process_registration_table
FOR EACH ROW
EXECUTE PROCEDURE after_process_delete();