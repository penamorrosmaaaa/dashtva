import { useState } from "react";
import { Button, Box, Input, useToast } from "@chakra-ui/react";
import { supabase } from "../supabaseClient";

const ExcelUploader = ({ onUploadComplete }) => {
  const [file, setFile] = useState(null);
  const toast = useToast();

  const handleUpload = async () => {
    if (!file) return;

    const fileName = `reporte_tarjetas_${Date.now()}.xlsx`;

    const { data, error } = await supabase.storage
      .from("files")
      .upload(fileName, file, {
        cacheControl: "3600",
        upsert: true,
        contentType: file.type,
      });

    if (error) {
      toast({
        title: "❌ Error al subir",
        description: error.message,
        status: "error",
        duration: 4000,
        isClosable: true,
      });
    } else {
      const { data: publicUrlData } = supabase.storage.from("files").getPublicUrl(fileName);
      const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`; // evita caché

      toast({
        title: "✅ Subido con éxito",
        description: "Generando dashboard...",
        status: "success",
        duration: 3000,
        isClosable: true,
      });

      // Llamar al backend
      await fetch("https://xlsx-backend.onrender.com/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl }),
      });

      if (onUploadComplete) onUploadComplete();
    }
  };

  return (
    <Box>
      <Input type="file" onChange={(e) => setFile(e.target.files[0])} />
      <Button mt={2} onClick={handleUpload}>
        Subir archivo Excel
      </Button>
    </Box>
  );
};

export default ExcelUploader;
