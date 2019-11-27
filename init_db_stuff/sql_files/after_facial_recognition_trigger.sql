CREATE TRIGGER after_facial_recognition_trigger
  AFTER INSERT
  ON public.facial_recognition_result
  FOR EACH ROW
  EXECUTE PROCEDURE public.after_facial_recognition_insert();
