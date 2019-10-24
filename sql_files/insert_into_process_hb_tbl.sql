-- TODO: MAKE THIS A STORED PROCEDURE
CREATE OR REPLACE FUNCTION process_heartbeat_insert(
	IN pid INTEGER,
	IN host_ip TEXT,
	IN process_name TEXT
) RETURNS INTEGER AS $$
BEGIN

	INSERT INTO process_heartbeat (process_pid,process_host_ip,process_name)
	VALUES (pid, host_ip, process_name);

	RETURN 1;
END;
$$
LANGUAGE plpgsql;