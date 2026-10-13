-- Permite que o usuário remova as próprias fontes do bucket 'fonts'
-- (a pasta raiz do caminho é o id do usuário, igual às políticas de INSERT/UPDATE).
DROP POLICY IF EXISTS "Users can delete own fonts" ON storage.objects;

CREATE POLICY "Users can delete own fonts"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'fonts'
  AND (auth.uid())::text = (storage.foldername(name))[1]
);
