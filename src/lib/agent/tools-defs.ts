export const TOOLS = [
  {
    type: 'function' as const,
    function: {
      name: 'list_available_slots',
      description: 'List available appointment slots for a doctor on a given date',
      parameters: {
        type: 'object',
        properties: {
          doctorId: { type: 'string', description: 'Doctor ID (optional, defaults to first available doctor)' },
          date: { type: 'string', description: 'Date in YYYY-MM-DD format (optional, defaults to today)' },
          serviceId: { type: 'string', description: 'Service ID to determine slot duration (optional, defaults to doctor default)' },
          durationMin: { type: 'number', description: 'Override slot duration in minutes (optional)' },
        },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'book_appointment',
      description: 'Book an appointment for a patient. Confirms with patient before calling.',
      parameters: {
        type: 'object',
        properties: {
          doctorId: { type: 'string', description: 'Doctor ID' },
          slotId: { type: 'string', description: 'Slot ID from list_available_slots' },
          patientName: { type: 'string', description: 'Patient name (or family member name if booking for someone else)' },
          patientPhone: { type: 'string', description: 'Patient WhatsApp number' },
          patientGender: { type: 'string', enum: ['male', 'female', 'unknown'] },
          familyMemberRelation: { type: 'string', description: 'If booking for family member: relation (spouse|child|parent|sibling|other)' },
          serviceId: { type: 'string', description: 'Service ID (optional)' },
          paymentMode: { type: 'string', enum: ['cash', 'online'], description: 'Payment mode' },
        },
        required: ['doctorId', 'slotId', 'patientName', 'patientPhone'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'cancel_appointment',
      description: "Cancel a patient's upcoming appointment",
      parameters: {
        type: 'object',
        properties: {
          appointmentId: { type: 'string', description: 'Appointment ID to cancel' },
          reason: { type: 'string', description: 'Reason for cancellation' },
        },
        required: ['appointmentId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_patient_history',
      description: "Get the current patient's appointment history (only their own)",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_live_queue_status',
      description: 'Get current queue status: currently-serving token, queue length, estimated wait',
      parameters: {
        type: 'object',
        properties: { doctorId: { type: 'string', description: 'Doctor ID (optional)' } },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_doctor_status',
      description: "Get a doctor's current status (in_clinic, break, off, on_way) and ETA",
      parameters: {
        type: 'object',
        properties: { doctorId: { type: 'string' } },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'transfer_to_human',
      description: 'Transfer the patient to a human receptionist (for complex cases, complaints, VIP handling)',
      parameters: {
        type: 'object',
        properties: { reason: { type: 'string' } },
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'reschedule_appointment',
      description: "Reschedule a patient's upcoming appointment to a new slot (optionally with a different doctor). Old slot is released, new slot is claimed.",
      parameters: {
        type: 'object',
        properties: {
          appointmentId: { type: 'string', description: 'The appointment ID to reschedule' },
          newSlotId: { type: 'string', description: 'New slot ID from list_available_slots' },
          newDoctorId: { type: 'string', description: 'New doctor ID (optional, defaults to same doctor)' },
          reason: { type: 'string', description: 'Reason for rescheduling (optional)' },
        },
        required: ['appointmentId', 'newSlotId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_family_member',
      description: "Get the current patient's family members (for booking on their behalf)",
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_clinic_info',
      description: 'Get clinic information: name, address, working hours, payment modes, bank details, online payment status',
      parameters: { type: 'object', properties: {} },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'add_family_member',
      description: 'Add a family member for the current patient (e.g., spouse mentioning their husband/wife, parents mentioning children). Call this automatically whenever the patient discloses a family relationship during conversation.',
      parameters: {
        type: 'object',
        properties: {
          name: { type: 'string', description: 'Family member full name' },
          relation: { type: 'string', enum: ['spouse', 'child', 'parent', 'sibling', 'other'], description: 'Relation to the current patient' },
          gender: { type: 'string', enum: ['male', 'female', 'unknown'], description: 'Gender of the family member' },
          notes: { type: 'string', description: 'Any extra context (age, medical notes, etc.)' },
        },
        required: ['name', 'relation', 'gender'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'attach_payment_proof',
      description: "Attach a payment screenshot/proof to a patient's appointment (for online payments). The patient uploads a screenshot and the agent links it.",
      parameters: {
        type: 'object',
        properties: {
          appointmentId: { type: 'string', description: 'Appointment ID to attach proof to' },
          screenshotUrl: { type: 'string', description: 'URL or identifier of the uploaded screenshot (optional on WhatsApp — proof is attached by reference)' },
          amount: { type: 'number', description: 'Amount paid (PKR)' },
        },
        required: ['appointmentId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'get_booking_status',
      description: 'Get the status and details of a recently booked appointment for confirmation. Call after booking to confirm details.',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: { type: 'string', description: 'The appointment ID to check' },
        },
        required: ['appointmentId'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'set_reminder_preference',
      description: 'Save patient reminder preference after booking. Call this ONLY after the patient explicitly answers the reminder question (haan/yes or nahi/no). Never call speculatively.',
      parameters: {
        type: 'object',
        properties: {
          appointmentId: { type: 'string', description: 'The appointment ID from the booking result (appointment.id)' },
          reminderNeeded: { type: 'boolean', description: 'true if patient said yes (wants reminder), false if they declined' },
          leadTime: { type: 'string', description: 'Patient-specified lead time like "30m", "1h", "1d". Default "30m" when patient does not specify.' },
        },
        required: ['appointmentId', 'reminderNeeded'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'update_patient_profile',
      description: 'Save the patient name/email/gender collected during chat so their portal profile is pre-filled. Call whenever the patient tells you their name or email. Do NOT call if the value is already known from PATIENT CONTEXT.',
      parameters: {
        type: 'object',
        properties: {
          patientPhone: { type: 'string', description: 'Patient WhatsApp number (from context)' },
          name: { type: 'string', description: 'Patient full name' },
          email: { type: 'string', description: 'Patient email for transactional messages (optional)' },
          gender: { type: 'string', enum: ['male', 'female', 'unknown'], description: 'Patient gender' },
        },
        required: ['patientPhone'],
      },
    },
  },
  {
    type: 'function' as const,
    function: {
      name: 'send_portal_link',
      description: 'Send the patient a portal login link via WhatsApp where they can book appointments, view live queue, and manage their visits — like a mobile app. Only call when PATIENT CONTEXT says portal account is NOT LINKED. Call this when patient asks for "link", "portal", "app", "online booking", "apna hisaab", or wants to self-serve.',
      parameters: {
        type: 'object',
        properties: {
          patientPhone: { type: 'string', description: 'Patient WhatsApp number to send the link to (from context)' },
        },
        required: ['patientPhone'],
      },
    },
  },
]
