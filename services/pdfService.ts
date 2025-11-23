
declare const pdfjsLib: any;

export const extractTextFromPdf = async (file: File): Promise<string> => {
    // Safety check to ensure library is loaded
    if (typeof pdfjsLib === 'undefined') {
        throw new Error("PDF.js library is not loaded. Please try again in a moment.");
    }

    // Set worker source safely if not already set
    if (!pdfjsLib.GlobalWorkerOptions.workerSrc) {
        pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;
    }

    try {
        const arrayBuffer = await file.arrayBuffer();
        const pdf = await pdfjsLib.getDocument(arrayBuffer).promise;
        let fullText = '';

        for (let i = 1; i <= pdf.numPages; i++) {
            const page = await pdf.getPage(i);
            const textContent = await page.getTextContent();
            const pageText = textContent.items.map((item: any) => item.str).join(' ');
            fullText += pageText + '\n\n';
        }

        return fullText.trim();
    } catch (error) {
        console.error("PDF processing failed:", error);
        throw new Error("Could not process the PDF file.");
    }
};
