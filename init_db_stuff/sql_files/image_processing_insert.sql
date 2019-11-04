-- TODO: MAKE THIS A STORED PROCEDURE
-- TODO: THIS SHOULD NOTIFY NEW USER SUBMISSION
CREATE OR REPLACE FUNCTION image_processing_insert(
	IN job_id TEXT,
	IN photo_path TEXT,
	IN processed_photo_path TEXT
) RETURNS INTEGER AS $$
BEGIN

	INSERT INTO image_processing_result (job_id,processed_photo_path,original_photo_path)
	VALUES (job_id,photo_path,processed_photo_path);

-- NOTIFY IMG PROC LISTENERS

	RETURN 1;
END;
$$
LANGUAGE plpgsql;