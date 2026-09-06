export interface AssessmentSheetData {
  patientId?: string;
  patientName: string;
  age?: number | string;
  gender?: string;
  contact?: string;
  status?: string;
  triageLevel: 'CRITICAL' | 'URGENT' | 'NON-URGENT';
  severity: number;
  department: string;
  estimatedWaitMinutes?: number;
  duration?: string;
  symptoms: string[];
  rawSymptoms?: string;
  clinicalRationale?: string;
  medicalHistory?: string[];
  medications?: string[];
  recommendedOrders?: string[];
  assignedDoctorName?: string;
  assignedDoctorId?: string;
  assignedDoctorDepartment?: string;
  assignedDoctorLicense?: string;
  hospitalName?: string;
  createdAt?: string;
  bedId?: string;
  bedNumber?: string;
  roomNumber?: string;
  ward?: string;
  floor?: string;
  locationInstructions?: string;
  admittedAt?: string;
}

export function generateAssessmentHtml(data: AssessmentSheetData): string {
  const patientName = data.patientName || 'Intake Patient';
  const doctorName = data.assignedDoctorName || 'Dr. Sarah Jenkins, MD';
  const doctorDept = data.assignedDoctorDepartment || 'Emergency & Critical Care';
  const doctorLicense = data.assignedDoctorLicense || 'MD-84920-CA';
  const hospitalName = data.hospitalName || 'Vitalis OS Central Hospital';
  const triageLevel = data.triageLevel || 'URGENT';
  const severity = data.severity ?? 5;
  const waitMinutes = data.estimatedWaitMinutes ?? 15;
  const department = data.department || 'Emergency Department';
  const recordId = data.patientId || `VTL-${Date.now().toString().slice(-6)}`;
  const dateFormatted = data.createdAt ? new Date(data.createdAt).toLocaleString() : new Date().toLocaleString();

  const triageColors = {
    CRITICAL: {
      bg: '#fee2e2',
      border: '#dc2626',
      text: '#991b1b',
      label: 'LEVEL 1 - CRITICAL (RESUSCITATION / IMMEDIATE)',
      tag: 'RED PRIORITY',
    },
    URGENT: {
      bg: '#fef3c7',
      border: '#d97706',
      text: '#92400e',
      label: 'LEVEL 2 - URGENT (EMERGENT CARE)',
      tag: 'AMBER PRIORITY',
    },
    'NON-URGENT': {
      bg: '#d1fae5',
      border: '#059669',
      text: '#065f46',
      label: 'LEVEL 3 - NON-URGENT (STABLE OUTPATIENT)',
      tag: 'GREEN PRIORITY',
    },
  };

  const currentTriage = triageColors[triageLevel] || triageColors['URGENT'];

  const symptomsListHtml = (data.symptoms && data.symptoms.length > 0)
    ? data.symptoms.map((s) => `<li style="margin-bottom: 4px;"><strong>${escapeHtml(s)}</strong></li>`).join('')
    : `<li>${escapeHtml(data.rawSymptoms || 'General acute medical intake symptoms')}</li>`;

  const historyHtml = (data.medicalHistory && data.medicalHistory.length > 0)
    ? data.medicalHistory.map((h) => `<span style="display:inline-block; background:#f1f5f9; border:1px solid #cbd5e1; border-radius:4px; padding:3px 8px; margin:2px 4px 2px 0; font-size:12px;">${escapeHtml(h)}</span>`).join('')
    : '<span style="font-size:12px; color:#64748b;">None reported or under clinical review</span>';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <title>Clinical Triage Assessment Sheet - ${escapeHtml(patientName)}</title>
  <style>
    @page {
      size: A4 portrait;
      margin: 12mm 15mm;
    }
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact;
      print-color-adjust: exact;
    }
    body {
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      color: #0f172a;
      background: #ffffff;
      margin: 0;
      padding: 0;
      font-size: 13px;
      line-height: 1.45;
    }
    .sheet-container {
      width: 100%;
      max-width: 800px;
      margin: 0 auto;
      padding: 10px;
    }
    .header-table {
      width: 100%;
      border-bottom: 2px solid #0284c7;
      padding-bottom: 12px;
      margin-bottom: 14px;
    }
    .hospital-title {
      font-size: 20px;
      font-weight: 800;
      color: #0369a1;
      text-transform: uppercase;
      letter-spacing: 0.5px;
      margin: 0;
    }
    .hospital-subtitle {
      font-size: 11px;
      color: #64748b;
      margin: 2px 0 0 0;
      font-weight: 500;
    }
    .doc-badge {
      font-size: 10px;
      font-weight: 700;
      text-transform: uppercase;
      background: #e0f2fe;
      color: #0369a1;
      padding: 3px 8px;
      border-radius: 4px;
      border: 1px solid #bae6fd;
      display: inline-block;
    }
    .info-grid {
      display: table;
      width: 100%;
      table-layout: fixed;
      margin-bottom: 14px;
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      background: #f8fafc;
      overflow: hidden;
    }
    .info-row {
      display: table-row;
    }
    .info-cell {
      display: table-cell;
      padding: 8px 12px;
      border-right: 1px solid #e2e8f0;
      border-bottom: 1px solid #e2e8f0;
      vertical-align: top;
    }
    .info-cell:last-child {
      border-right: none;
    }
    .info-label {
      font-size: 10px;
      text-transform: uppercase;
      font-weight: 700;
      color: #64748b;
      display: block;
      margin-bottom: 2px;
    }
    .info-val {
      font-size: 13px;
      font-weight: 700;
      color: #0f172a;
    }
    .triage-banner {
      background: ${currentTriage.bg};
      border: 2px solid ${currentTriage.border};
      color: ${currentTriage.text};
      padding: 10px 14px;
      border-radius: 8px;
      margin-bottom: 14px;
      display: flex;
      justify-content: space-between;
      align-items: center;
    }
    .triage-title {
      font-size: 14px;
      font-weight: 900;
      letter-spacing: 0.5px;
      text-transform: uppercase;
    }
    .triage-pill {
      background: #ffffff;
      color: ${currentTriage.text};
      border: 1px solid ${currentTriage.border};
      font-weight: 800;
      padding: 3px 9px;
      border-radius: 12px;
      font-size: 11px;
    }
    .section-title {
      font-size: 12px;
      font-weight: 800;
      text-transform: uppercase;
      letter-spacing: 0.6px;
      color: #1e293b;
      border-bottom: 1px solid #cbd5e1;
      padding-bottom: 4px;
      margin: 14px 0 8px 0;
    }
    .clinical-box {
      border: 1px solid #e2e8f0;
      border-radius: 8px;
      padding: 10px 12px;
      background: #ffffff;
      margin-bottom: 10px;
    }
    .rationale-quote {
      background: #f0fdf4;
      border-left: 4px solid #16a34a;
      padding: 8px 12px;
      font-size: 12px;
      color: #14532d;
      margin: 6px 0;
      border-radius: 0 6px 6px 0;
    }
    .doctor-auth-box {
      margin-top: 20px;
      border: 1.5px dashed #94a3b8;
      border-radius: 8px;
      padding: 12px 16px;
      background: #f8fafc;
    }
    .signature-line {
      border-bottom: 1.5px solid #0f172a;
      width: 220px;
      display: inline-block;
      margin-top: 30px;
    }
    .footer-note {
      margin-top: 20px;
      font-size: 10px;
      color: #94a3b8;
      text-align: center;
      border-top: 1px solid #e2e8f0;
      padding-top: 8px;
    }
    @media print {
      body {
        margin: 0;
        padding: 0;
      }
      .no-print {
        display: none !important;
      }
    }
  </style>
</head>
<body>
  <div class="sheet-container">
    <!-- Header -->
    <table class="header-table">
      <tr>
        <td style="vertical-align: middle;">
          <h1 class="hospital-title">Vitalis OS Health System</h1>
          <p class="hospital-subtitle">Emergency Medicine & Acute Clinical Triage Intake Division • ${escapeHtml(hospitalName)}</p>
        </td>
        <td style="text-align: right; vertical-align: middle;">
          <span class="doc-badge">Official Clinical Record</span>
          <div style="font-size: 11px; font-weight: 700; color: #334155; margin-top: 4px;">MRN / ID: ${escapeHtml(recordId)}</div>
          <div style="font-size: 10px; color: #64748b;">Intake Time: ${escapeHtml(dateFormatted)}</div>
        </td>
      </tr>
    </table>

    <!-- Triage Priority Banner -->
    <div class="triage-banner">
      <div>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; display: block; opacity: 0.85;">Triage Urgency Classification</span>
        <span class="triage-title">${escapeHtml(currentTriage.label)}</span>
      </div>
      <div style="text-align: right;">
        <span class="triage-pill">${escapeHtml(currentTriage.tag)}</span>
      </div>
    </div>

    ${data.bedNumber ? `
    <!-- Bed & Room Allocation Physical Location Stamp -->
    <div style="border: 2px solid #0284c7; background: #f0f9ff; border-radius: 8px; margin-bottom: 14px; overflow: hidden;">
      <div style="background: #0284c7; color: #ffffff; padding: 6px 12px; font-size: 11px; font-weight: 800; text-transform: uppercase; letter-spacing: 0.5px; display: flex; justify-content: space-between; align-items: center;">
        <span>PHYSICAL LOCATION ALLOCATION • ADMITTED PATIENT STAMP</span>
        <span style="background: #ffffff; color: #0284c7; padding: 2px 8px; border-radius: 4px; font-size: 10px; font-weight: 900;">CONFIRMED</span>
      </div>
      <table style="width: 100%; border-collapse: collapse;">
        <tr>
          <td style="padding: 10px 14px; border-right: 1px solid #bae6fd; width: 25%; vertical-align: top;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0369a1; display: block;">ROOM NUMBER</span>
            <span style="font-size: 17px; font-weight: 900; color: #0c4a6e; display: block; margin-top: 2px;">${escapeHtml(data.roomNumber || 'Assigned Room')}</span>
            <span style="font-size: 10px; color: #0284c7; font-weight: 600;">${escapeHtml(data.floor || 'Care Pavilion')}</span>
          </td>
          <td style="padding: 10px 14px; border-right: 1px solid #bae6fd; width: 25%; vertical-align: top;">
            <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #0369a1; display: block;">BED NUMBER & WARD</span>
            <span style="font-size: 17px; font-weight: 900; color: #0f172a; display: block; margin-top: 2px;">${escapeHtml(data.bedNumber)}</span>
            <span style="font-size: 10px; color: #0369a1; font-weight: 700;">Ward: ${escapeHtml(data.ward || department)}</span>
          </td>
          <td style="padding: 10px 14px; width: 50%; vertical-align: top; background: #ffffff;">
            <span style="font-size: 10px; font-weight: 800; text-transform: uppercase; color: #15803d; display: block;">DIRECT WALKING & RECEPTION INSTRUCTIONS</span>
            <p style="margin: 3px 0 0 0; font-size: 11px; color: #166534; font-weight: 600; line-height: 1.4;">
              ${escapeHtml(data.locationInstructions || `Proceed directly to ${data.ward || department} Nursing Station. Present this official assessment sheet for bed intake.`)}
            </p>
          </td>
        </tr>
      </table>
    </div>
    ` : `
    <!-- Pending Bed Allocation Notice -->
    <div style="border: 1px dashed #cbd5e1; background: #f8fafc; border-radius: 8px; padding: 8px 12px; margin-bottom: 14px; display: flex; justify-content: space-between; align-items: center;">
      <div>
        <span style="font-size: 10px; font-weight: 700; text-transform: uppercase; color: #64748b; display: block;">Bed & Room Allocation Status</span>
        <span style="font-size: 12px; font-weight: 700; color: #334155;">Triage Intake Queue • Awaiting Room & Bed Assignment</span>
      </div>
      <span style="font-size: 10px; font-weight: 700; background: #f1f5f9; color: #475569; padding: 3px 8px; border-radius: 4px; border: 1px solid #cbd5e1;">
        PRIORITY QUEUE
      </span>
    </div>
    `}

    <!-- Patient & Attending Doctor Grid -->
    <div class="info-grid">
      <div class="info-row">
        <div class="info-cell" style="width: 35%;">
          <span class="info-label">Patient Full Name</span>
          <span class="info-val" style="color: #0369a1; font-size: 14px;">${escapeHtml(patientName)}</span>
        </div>
        <div class="info-cell" style="width: 25%;">
          <span class="info-label">Demographics</span>
          <span class="info-val">${data.age ? escapeHtml(String(data.age)) + ' yrs' : 'Adult'} • ${escapeHtml(data.gender || 'Not specified')}</span>
        </div>
        <div class="info-cell" style="width: 40%;">
          <span class="info-label">Attending Physician (Full Name)</span>
          <span class="info-val" style="color: #0f172a; font-size: 13px;">${escapeHtml(doctorName)}</span>
          <div style="font-size: 10px; color: #64748b; margin-top: 2px;">License: <strong>${escapeHtml(doctorLicense)}</strong> • ${escapeHtml(doctorDept)}</div>
        </div>
      </div>
      <div class="info-row">
        <div class="info-cell">
          <span class="info-label">Recommended Ward / Service</span>
          <span class="info-val">${escapeHtml(department)}</span>
        </div>
        <div class="info-cell">
          <span class="info-label">Clinical Acuity Score</span>
          <span class="info-val" style="color: #dc2626;">${severity} / 10 Scale</span>
        </div>
        <div class="info-cell">
          <span class="info-label">Estimated Initial Wait Time</span>
          <span class="info-val">${waitMinutes} Minutes</span>
        </div>
      </div>
    </div>

    <!-- Clinical Chief Complaints -->
    <div class="section-title">Chief Medical Complaints & Reported Symptoms</div>
    <div class="clinical-box">
      <ul style="margin: 0; padding-left: 20px;">
        ${symptomsListHtml}
      </ul>
      ${data.duration ? `<div style="margin-top: 6px; font-size: 11px; color: #475569;"><strong>Reported Symptom Duration:</strong> ${escapeHtml(data.duration)}</div>` : ''}
    </div>

    <!-- Medical History -->
    <div class="section-title">Reported History & Pre-existing Conditions</div>
    <div class="clinical-box" style="padding: 8px 12px;">
      ${historyHtml}
    </div>

    <!-- AI Triage Impression & Clinical Rationale -->
    <div class="section-title">Clinical Impression & Triage Rationale</div>
    <div class="clinical-box">
      <div class="rationale-quote">
        <strong>Triage Assessment Note:</strong> ${escapeHtml(data.clinicalRationale || 'Patient presenting for emergent intake triage. Immediate physical examination, telemetry vital monitoring, and physician evaluation recommended.')}
      </div>
      <div style="margin-top: 6px; font-size: 11px; color: #334155;">
        <strong>Immediate Clinical Directives:</strong> Assign patient to ${escapeHtml(department)} triage queue; prepare intake vitals (BP, SpO2, HR, Temp); notify attending physician <strong>${escapeHtml(doctorName)}</strong>.
      </div>
    </div>

    <!-- Attending Doctor Access & Authorization Block -->
    <div class="doctor-auth-box">
      <table style="width: 100%;">
        <tr>
          <td style="vertical-align: top; width: 60%;">
            <div style="font-size: 11px; font-weight: 800; text-transform: uppercase; color: #0369a1; margin-bottom: 3px;">
              Attending Physician Review & Full Access Authorization
            </div>
            <div style="font-size: 11px; color: #334155; line-height: 1.4;">
              I certify that I am the attending physician authorized to access and review this clinical intake summary.
            </div>
            <div style="margin-top: 6px; font-size: 12px;">
              <strong>Doctor Name:</strong> ${escapeHtml(doctorName)}<br>
              <strong>Medical License:</strong> ${escapeHtml(doctorLicense)}<br>
              <strong>Department:</strong> ${escapeHtml(doctorDept)}
            </div>
          </td>
          <td style="text-align: right; vertical-align: bottom; width: 40%;">
            <div class="signature-line"></div>
            <div style="font-size: 11px; font-weight: 700; color: #1e293b; margin-top: 4px;">
              Physician Signature / Verification Stamp
            </div>
            <div style="font-size: 10px; color: #64748b;">Date: ${escapeHtml(new Date().toLocaleDateString())}</div>
          </td>
        </tr>
      </table>
    </div>

    <!-- Footer Security Notice -->
    <div class="footer-note">
      CONFIDENTIAL MEDICAL INTAKE RECORD • GENERATED VIA VITALIS OS CLINICAL INTAKE PLATFORM • PROTECTED HEALTH INFORMATION (PHI)
    </div>
  </div>

  <script>
    window.addEventListener('load', function() {
      // Auto-focus document
      window.focus();
    });
  </script>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  if (!str) return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Print the assessment sheet reliably across all iframe sandboxes and browsers
 */
export async function printAssessmentSheetDocument(data: AssessmentSheetData): Promise<{
  success: boolean;
  methodUsed: 'iframe' | 'blob' | 'download';
  message?: string;
}> {
  const htmlContent = generateAssessmentHtml(data);

  // Strategy 1: Hidden iframe print
  try {
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'fixed';
    printFrame.style.right = '0';
    printFrame.style.bottom = '0';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = '0';
    printFrame.style.visibility = 'hidden';
    printFrame.id = `print-assessment-iframe-${Date.now()}`;

    document.body.appendChild(printFrame);

    const frameDoc = printFrame.contentWindow?.document || printFrame.contentDocument;
    if (frameDoc) {
      frameDoc.open();
      frameDoc.write(htmlContent);
      frameDoc.close();

      // Allow DOM to parse and render styles before print
      await new Promise((resolve) => setTimeout(resolve, 300));

      try {
        printFrame.contentWindow?.focus();
        printFrame.contentWindow?.print();

        // Clean up after 2 minutes
        setTimeout(() => {
          if (printFrame && printFrame.parentNode) {
            printFrame.parentNode.removeChild(printFrame);
          }
        }, 120000);

        return { success: true, methodUsed: 'iframe' };
      } catch (err: any) {
        console.warn('Iframe window.print() failed due to sandbox restrictions, trying blob/download fallback:', err);
      }
    }
  } catch (err) {
    console.warn('Iframe injection failed:', err);
  }

  // Strategy 2: Download standalone print-ready HTML file
  downloadAssessmentSheet(data);
  return {
    success: true,
    methodUsed: 'download',
    message: 'Assessment sheet downloaded as print-ready clinical document.',
  };
}

/**
 * Direct file download for immediate offline printing / saving as PDF
 */
export function downloadAssessmentSheet(data: AssessmentSheetData, filename?: string): void {
  const htmlContent = generateAssessmentHtml(data);
  const cleanName = (data.patientName || 'Patient').replace(/[^a-zA-Z0-9_-]/g, '_');
  const targetName = filename || `Assessment_Sheet_${cleanName}_${new Date().toISOString().slice(0, 10)}.html`;

  const blob = new Blob([htmlContent], { type: 'text/html;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = targetName;
  document.body.appendChild(link);
  link.click();

  setTimeout(() => {
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, 1000);
}
