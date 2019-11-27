-- Function: public.after_image_processing_insert()

-- DROP FUNCTION public.after_image_processing_insert();

CREATE OR REPLACE FUNCTION public.after_facial_recognition_insert()
  RETURNS trigger AS
$BODY$

BEGIN
	PERFORM pg_notify( 'recognition_job', '{"table": "facial_recognition_result", "facial_recognition_id":' || NEW.facial_recognition_id || ',"job_id":"' || NEW.job_id || 
						'","photo_path":"' || NEW.photo_path || '","person_name":"' || NEW.person_name || 
						'","submission_time":' || NEW.submission_time || '}');

	RETURN NEW;
END;

$BODY$
  LANGUAGE plpgsql VOLATILE
  COST 100;
ALTER FUNCTION public.after_facial_recognition_insert()
  OWNER TO postgres;
