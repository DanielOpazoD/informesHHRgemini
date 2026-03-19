import jsPDF from 'jspdf';
import type { ClinicalRecord } from '../types';
import { TEMPLATES } from '../constants';
import { formatDateDMY } from './dateUtils';

interface PdfGeneratorOptions {
    record: ClinicalRecord;
}

export async function generatePdfAsBlob({ record }: PdfGeneratorOptions): Promise<Blob> {
    const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'letter' });
    const marginX = 16;
    const marginY = 18;
    const lineHeight = 6;
    const pageWidth = pdf.internal.pageSize.getWidth();
    const pageHeight = pdf.internal.pageSize.getHeight();
    const contentWidth = pageWidth - marginX * 2;
    let cursorY = marginY;

    const ensureSpace = (height: number) => {
        if (cursorY + height > pageHeight - marginY) {
            pdf.addPage();
            cursorY = marginY;
        }
    };

    const addTitle = (text: string) => {
        if (!text.trim()) return;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(16);
        ensureSpace(lineHeight * 2);
        pdf.text(text, pageWidth / 2, cursorY, { align: 'center' });
        cursorY += lineHeight + 3;
    };

    const addSectionTitle = (text: string) => {
        if (!text.trim()) return;
        pdf.setFont('helvetica', 'bold');
        pdf.setFontSize(12);
        ensureSpace(lineHeight * 1.2);
        pdf.text(text.trim(), marginX, cursorY);
        cursorY += lineHeight;
    };

    const addLabeledValue = (label: string, value: string | undefined) => {
        const labelText = `${label}:`;
        const displayValue = value && value.trim() ? value : '—';
        const maxLabelWidth = contentWidth * 0.45;
        pdf.setFontSize(11);
        pdf.setFont('helvetica', 'bold');
        const rawLabelWidth = pdf.getTextWidth(labelText);
        const labelWidth = Math.min(rawLabelWidth, maxLabelWidth);
        const hasInlineSpace = labelWidth + 4 < contentWidth;

        if (!hasInlineSpace) {
            const labelLines = pdf.splitTextToSize(labelText, contentWidth);
            const valueLines = pdf.splitTextToSize(displayValue, contentWidth);
            const totalHeight = lineHeight * (labelLines.length + valueLines.length);
            ensureSpace(totalHeight + 2);
            labelLines.forEach((line: string) => {
                pdf.text(line, marginX, cursorY);
                cursorY += lineHeight;
            });
            pdf.setFont('helvetica', 'normal');
            valueLines.forEach((line: string) => {
                pdf.text(line, marginX, cursorY);
                cursorY += lineHeight;
            });
            cursorY += 1.5;
            return;
        }

        const valueWidth = Math.max(contentWidth - labelWidth - 4, contentWidth * 0.35);
        const valueLines = pdf.splitTextToSize(displayValue, valueWidth);
        const blockHeight = lineHeight * valueLines.length;
        ensureSpace(blockHeight + 2);
        pdf.text(labelText, marginX, cursorY);
        pdf.setFont('helvetica', 'normal');
        valueLines.forEach((line: string, index: number) => {
            pdf.text(line, marginX + labelWidth + 4, cursorY + index * lineHeight);
        });
        cursorY += blockHeight;
        cursorY += 1.5;
    };

    const pxToMm = (px: number) => (px * 25.4) / 96;

    const addParagraphs = async (content: string) => {
        if (!content || typeof window === 'undefined') {
            ensureSpace(lineHeight * 1.2);
            pdf.setFont('helvetica', 'italic');
            pdf.text('Sin contenido registrado.', marginX, cursorY);
            pdf.setFont('helvetica', 'normal');
            cursorY += lineHeight + 1.5;
            return;
        }

        type Block = { type: 'text'; text: string } | { type: 'image'; src: string; widthPx?: number };
        const container = document.createElement('div');
        container.innerHTML = content;
        container.querySelectorAll('li').forEach(li => {
            const parent = li.parentElement;
            const isOrdered = parent?.tagName === 'OL';
            const index = parent ? Array.from(parent.children).indexOf(li) + 1 : 0;
            const prefix = isOrdered ? `${index}. ` : '• ';
            const text = li.innerText.trim();
            if (text.startsWith(prefix.trim())) return;
            li.insertAdjacentText('afterbegin', prefix);
        });

        const blocks: Block[] = [];
        let textBuffer = '';
        const blockLevelTags = new Set(['P', 'DIV', 'SECTION', 'ARTICLE', 'UL', 'OL', 'LI', 'H1', 'H2', 'H3', 'H4', 'H5', 'H6']);
        const flushTextBuffer = () => {
            const normalized = textBuffer.replace(/\u00A0/g, ' ');
            if (normalized.trim()) {
                blocks.push({ type: 'text', text: normalized });
            }
            textBuffer = '';
        };

        const walkNode = (node: Node) => {
            if (node.nodeType === Node.TEXT_NODE) {
                textBuffer += node.textContent || '';
                return;
            }
            if (!(node instanceof HTMLElement)) return;
            if (node.tagName === 'IMG') {
                const imageNode = node as HTMLImageElement;
                flushTextBuffer();
                blocks.push({
                    type: 'image',
                    src: imageNode.currentSrc || imageNode.src,
                    widthPx: imageNode.clientWidth || imageNode.naturalWidth || undefined,
                });
                return;
            }
            if (node.tagName === 'BR') {
                textBuffer += '\n';
                return;
            }
            node.childNodes.forEach(child => walkNode(child));
            if (blockLevelTags.has(node.tagName)) {
                textBuffer += '\n';
            }
        };

        container.childNodes.forEach(node => walkNode(node));
        flushTextBuffer();

        const hasRenderableContent = blocks.length > 0;
        if (!hasRenderableContent) {
            ensureSpace(lineHeight * 1.2);
            pdf.setFont('helvetica', 'italic');
            pdf.text('Sin contenido registrado.', marginX, cursorY);
            pdf.setFont('helvetica', 'normal');
            cursorY += lineHeight + 1.5;
            return;
        }

        const resolveImageSource = async (source: string): Promise<string | null> => {
            if (!source) return null;
            if (source.startsWith('data:image/')) return source;
            try {
                const response = await fetch(source);
                const blob = await response.blob();
                return await new Promise<string>((resolve, reject) => {
                    const reader = new FileReader();
                    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result : '');
                    reader.onerror = () => reject(reader.error);
                    reader.readAsDataURL(blob);
                });
            } catch (error) {
                console.warn('No se pudo convertir la imagen para PDF', error);
                return null;
            }
        };

        const addTextBlock = (text: string) => {
            const paragraphs = text
                .split(/\r?\n+/)
                .map(paragraph => paragraph.trim())
                .filter(Boolean);

            if (paragraphs.length === 0) return;
            pdf.setFont('helvetica', 'normal');
            pdf.setFontSize(11);
            paragraphs.forEach((paragraph, index) => {
                const lines = pdf.splitTextToSize(paragraph, contentWidth);
                ensureSpace(lineHeight * lines.length + 1);
                lines.forEach((line: string) => {
                    pdf.text(line, marginX, cursorY);
                    cursorY += lineHeight;
                });
                if (index < paragraphs.length - 1) {
                    cursorY += 1.5;
                }
            });
            cursorY += 2;
        };

        const addImageBlock = async (src: string, widthPx?: number) => {
            const resolvedSource = await resolveImageSource(src);
            if (!resolvedSource) return;
            try {
                const properties = pdf.getImageProperties(resolvedSource);
                if (!properties.width || !properties.height) return;
                const requestedWidth = widthPx ? pxToMm(widthPx) : contentWidth * 0.7;
                const renderWidth = Math.min(contentWidth, Math.max(30, requestedWidth));
                const renderHeight = (properties.height / properties.width) * renderWidth;
                ensureSpace(renderHeight + 3);
                pdf.addImage(resolvedSource, properties.fileType || 'PNG', marginX, cursorY, renderWidth, renderHeight, undefined, 'FAST');
                cursorY += renderHeight + 2;
            } catch (error) {
                console.warn('No se pudo renderizar una imagen en PDF', error);
            }
        };

        for (const block of blocks) {
            if (block.type === 'text') {
                addTextBlock(block.text);
                continue;
            }
            await addImageBlock(block.src, block.widthPx);
        }
    };

    const templateTitle = record.title?.trim() || TEMPLATES[record.templateId]?.title || 'Registro Clínico';
    addTitle(templateTitle);

    pdf.setFont('helvetica', 'normal');
    pdf.setFontSize(11);

    addSectionTitle('Información del Paciente');
    cursorY += 1;
    record.patientFields.forEach(field => {
        addLabeledValue(field.label, field.value);
    });
    cursorY += 2;

    for (const section of record.sections) {
        addSectionTitle(section.title);
        if (section.kind === 'clinical-update') {
            if (section.updateDate) {
                addLabeledValue('Fecha', formatDateDMY(section.updateDate));
            }
            if (section.updateTime) {
                addLabeledValue('Hora', section.updateTime);
            }
        }
        await addParagraphs(section.content);
    }

    if (record.medico || record.especialidad) {
        addSectionTitle('Profesional Responsable');
        if (record.medico) addLabeledValue('Médico', record.medico);
        if (record.especialidad) addLabeledValue('Especialidad', record.especialidad);
    }

    return pdf.output('blob');
}
