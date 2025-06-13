import React, { useState } from "react";
import { Box, Button, Input, Text, useToast } from "@chakra-ui/react";
import { supabase } from "../supabaseClient"; // ✅ adjust if path differs

const CsrDashboardUploader = () => {
  const [file, setFile] = useState(null);
  const [iframeKey, setIframeKey] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);
  const toast = useToast();

  const handleUpload = async () => {
    if (!file) {
      toast({
        title: "Archivo requerido",
        description: "Selecciona un archivo .xlsx para continuar.",
        status: "warning",
        duration: 3000,
        isClosable: true,
      });
      return;
    }

    setIsGenerating(true);

    try {
      const fileName = `csr_${Date.now()}.xlsx`;

      const { error } = await supabase.storage
        .from("files")
        .upload(fileName, file, {
          cacheControl: "3600",
          upsert: true,
          contentType: file.type,
        });

      if (error) throw new Error(error.message);

      const { data: publicUrlData } = supabase.storage
        .from("files")
        .getPublicUrl(fileName);

      const publicUrl = `${publicUrlData.publicUrl}?t=${Date.now()}`;

      const response = await fetch("https://csr-mudj.onrender.com/generate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: publicUrl }),
      });

      const result = await response.json();
      if (!response.ok) throw new Error(result.error || "Render backend error");

      toast({
        title: "Dashboard generado",
        description: "Ya puedes visualizarlo abajo.",
        status: "success",
        duration: 4000,
        isClosable: true,
      });

      setIframeKey((prev) => prev + 1);
      setFile(null);
    } catch (err) {
      toast({
        title: "Error",
        description: err.message,
        status: "error",
        duration: 5000,
        isClosable: true,
      });
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Box p={6} pt="150px">
      <Input
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => setFile(e.target.files[0])}
        mb={3}
      />
      <Button
        colorScheme="blue"
        onClick={handleUpload}
        isLoading={isGenerating}
        loadingText="Generando..."
        mb={3}
      >
        Subir y generar dashboard
      </Button>

      {file && (
        <Text fontSize="sm" color="blue.200">
          Archivo seleccionado: {file.name}
        </Text>
      )}

      <Box mt={5} w="100%" h="80vh" border="1px solid #ccc" borderRadius="md">
        <iframe
          key={iframeKey}
          src={`https://csr-mudj.onrender.com/dashboard.html?t=${Date.now()}`}
          title="Dashboard"
          width="100%"
          height="100%"
          style={{ border: "none" }}
        />
      </Box>
    </Box>
  );
};

export default CsrDashboardUploader;
