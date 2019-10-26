CREATE TRIGGER after_process_heartbeat_trigger
AFTER INSERT
ON process_heartbeat_table
FOR EACH ROW
EXECUTE PROCEDURE after_process_heartbeat();