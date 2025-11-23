
import type { FlashcardData } from '../types';

declare var html2pdf: any;

export const downloadFile = (content: string, fileName: string, mimeType: string, withBom: boolean = false) => {
  const blobContent = withBom ? '\uFEFF' + content : content;
  const blob = new Blob([blobContent], { type: `${mimeType};charset=utf-8` });
  
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = fileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const exportToPdf = async (content: string, fileName: string) => {
    const element = document.createElement('div');
    element.dir = 'rtl';
    element.style.fontFamily = "'Cairo', sans-serif";
    element.style.padding = '20px';
    element.style.color = '#000';
    element.style.background = '#fff';
    element.style.maxWidth = '100%';
    
    // Header
    const header = document.createElement('h1');
    header.innerText = 'ملخص النص';
    header.style.textAlign = 'center';
    header.style.marginBottom = '20px';
    header.style.color = '#1d4ed8'; // blue-700
    header.style.fontSize = '24px';
    header.style.fontWeight = 'bold';
    element.appendChild(header);

    // Content
    const contentDiv = document.createElement('div');
    contentDiv.style.whiteSpace = 'pre-wrap';
    contentDiv.style.lineHeight = '1.8';
    contentDiv.style.fontSize = '14px';
    contentDiv.innerText = content;
    element.appendChild(contentDiv);
    
    // Footer
    const footer = document.createElement('div');
    footer.innerText = 'تم الإنشاء بواسطة: ملخص النصوص بالذكاء الاصطناعي';
    footer.style.marginTop = '30px';
    footer.style.fontSize = '10px';
    footer.style.textAlign = 'center';
    footer.style.color = '#666';
    footer.style.borderTop = '1px solid #eee';
    footer.style.paddingTop = '10px';
    element.appendChild(footer);

    // We rely on html2pdf to handle rendering. It renders whatever element we give it.
    // We don't necessarily need to append it to the body if we pass the element directly to `from()`.
    // However, sometimes styles (like fonts) are better picked up if the element is in DOM, but html2pdf usually handles off-screen elements fine if they are self-contained.
    
    const opt = {
        margin: 15,
        filename: fileName,
        image: { type: 'jpeg', quality: 0.98 },
        html2canvas: { scale: 2, useCORS: true, letterRendering: true },
        jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } catch (e) {
        console.error("PDF Export failed", e);
        alert("فشل في إنشاء ملف PDF. يرجى المحاولة مرة أخرى.");
    }
};

/**
 * Converts an array of flashcard data into a CSV formatted string.
 * This function properly handles special characters to ensure CSV compatibility:
 * - Fields containing commas or newlines are enclosed in double quotes.
 * - Double quotes within a field are escaped by doubling them (e.g., " becomes "").
 * This implementation adheres to standard CSV formatting rules (RFC 4180).
 */
export const convertFlashcardsToCSV = (flashcards: FlashcardData[]): string => {
  const header = ['question', 'answer'];
  const rows = flashcards.map(card => {
    // For each field, we perform two crucial steps for valid CSV formatting:
    // 1. Escape any internal double quotes by replacing them with two double quotes ("").
    // 2. Enclose the entire field in double quotes. This ensures that any
    //    special characters, such as commas or newlines, are treated as literal content.
    const escapedQuestion = `"${card.question.replace(/"/g, '""')}"`;
    const escapedAnswer = `"${card.answer.replace(/"/g, '""')}"`;
    return [escapedQuestion, escapedAnswer].join(',');
  });
  return [header.join(','), ...rows].join('\n');
};
