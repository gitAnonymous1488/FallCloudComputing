-- TODO: MAKE THIS A STORED PROCEDURE
-- TODO: THIS SHOULD NOTIFY NEW USER SUBMISSION
CREATE OR REPLACE FUNCTION user_submision_insert(
	IN job_id TEXT,
	IN photo_path TEXT
) RETURNS INTEGER AS $$
BEGIN

	INSERT INTO user_submision_table (job_id,photo_path)
	VALUES (job_id, photo_path);

-- NOTIFY IMG PROC LISTENERS

	RETURN 1;
END;
$$
LANGUAGE plpgsql;