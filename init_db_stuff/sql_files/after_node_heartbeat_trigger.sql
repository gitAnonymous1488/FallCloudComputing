CREATE TRIGGER after_node_heartbeat_trigger
AFTER INSERT
ON node_heartbeat_table
FOR EACH ROW
EXECUTE PROCEDURE after_node_heartbeat();