import { Box, Button, Input, useToast } from '@chakra-ui/react';
import { ref, uploadBytesResumable } from 'firebase/storage';
import { storage } from '../firebaseConfig';
import { useState } from 'react';

const ExcelUploader = () => {
  const toast = useToast();
  const [file, setFile] = useState(null);

  const handleUpload = () => {
    if (!file) return;

    const uniqueName = `reporte_tarjetas_${Date.now()}.xlsx`;
    const storageRef = ref(storage, uniqueName);
    const uploadTask = uploadBytesResumable(storageRef, file);

    uploadTask.on(
      'state_changed',
      null,
      (error) => {
        console.error('Firebase Upload Error:', error);
        toast({
          title: '❌ Error al subir',
          description: error.message,
          status: 'error',
          duration: 4000,
          isClosable: true,
        });
      },
      () => {
        toast({
          title: '✅ Subida exitosa',
          description: 'El archivo fue subido a Firebase Storage',
          status: 'success',
          duration: 3000,
          isClosable: true,
        });
      }
    );
  };

  return (
    <Box>
      <Input
        type="file"
        accept=".xlsx"
        onChange={(e) => setFile(e.target.files[0])}
        mb={4}
      />
      <Button onClick={handleUpload} colorScheme="purple">
        Subir archivo Excel
      </Button>
    </Box>
  );
};

export default ExcelUploader;
