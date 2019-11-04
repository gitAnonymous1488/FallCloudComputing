-- TODO: MAKE THIS A STORED PROCEDURE
-- TODO: THIS SHOULD NOTIFY NEW USER SUBMISSION
CREATE OR REPLACE FUNCTION facial_detection_insert(
	IN job_id TEXT,
	IN processed_photo_path TEXT,
	IN original_photo_path TEXT,
	IN bounding_box_x INTEGER,
	IN bounding_box_y INTEGER,
	IN bounding_box_width INTEGER,
	IN bounding_box_height INTEGER
) RETURNS INTEGER AS $$
BEGIN

	INSERT INTO facial_detection_result (job_id,processed_photo_path,original_photo_path,bounding_box_x,bounding_box_y,bounding_box_width,bounding_box_height)
	VALUES (job_id,processed_photo_path,original_photo_path,bounding_box_x,bounding_box_y,bounding_box_width,bounding_box_height);

-- NOTIFY IMG PROC LISTENERS

	RETURN 1;
END;
$$
LANGUAGE plpgsql;