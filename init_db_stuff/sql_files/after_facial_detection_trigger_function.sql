-- Function: public.after_image_processing_insert()

-- DROP FUNCTION public.after_image_processing_insert();

CREATE OR REPLACE FUNCTION public.after_facial_detection_insert()
  RETURNS trigger AS
$BODY$

BEGIN
	PERFORM pg_notify( 'detection_job', '{"table": "facial_detection_result", "facial_detection_id":' || NEW.facial_detection_id || ',"job_id":"' || NEW.job_id || 
						'","processed_photo_path":"' || NEW.processed_photo_path || '","original_photo_path":"' || NEW.original_photo_path || 
						'","bounding_box_x":"' || NEW.bounding_box_x || '","bounding_box_y":"' || NEW.bounding_box_y || 
						'","bounding_box_width":"' || NEW.bounding_box_width || '","bounding_box_height":"' || NEW.bounding_box_height || '","submission_time":' || NEW.submission_time || '}');

	RETURN NEW;
END;

$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION public.after_image_processing_insert()
  OWNER TO postgres;
