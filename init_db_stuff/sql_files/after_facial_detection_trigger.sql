CREATE TRIGGER after_facial_detection_trigger
  AFTER INSERT
  ON public.facial_detection_result
  FOR EACH ROW
  EXECUTE PROCEDURE public.after_facial_detection_insert();
