-- TODO: MAKE THIS A STORED PROCEDURE
-- TODO: THIS SHOULD NOTIFY NEW USER SUBMISSION
CREATE OR REPLACE FUNCTION facial_recognition_insert(
	IN job_id TEXT,
	IN photo_path TEXT,
	IN person_name TEXT
) RETURNS INTEGER AS $$
BEGIN

	INSERT INTO facial_recognition_result (job_id,photo_path,person_name)
	VALUES (job_id,photo_path,person_name);

-- NOTIFY IMG PROC LISTENERS

	RETURN 1;
END;
$$
LANGUAGE plpgsql;