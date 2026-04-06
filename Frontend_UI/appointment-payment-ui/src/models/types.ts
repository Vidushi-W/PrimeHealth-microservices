export type AppointmentStatus =
    | 'PENDING_PAYMENT'
    | 'CONFIRMED'
    | 'CANCELLED'
    | 'COMPLETED'
    | 'MISSED'
    | 'RESCHEDULED';

export interface Appointment {
    appointmentId: string;
    patientId: string;
    doctorId: string;
    doctorName: string;
    doctorSpecialty: string;
    appointmentDate: string;
    timeSlot: string;
    status: AppointmentStatus;
    queueNumber?: string;
    symptoms: string;
    notes?: string;
    paymentStatus: 'UNPAID' | 'PAID' | 'REFUNDED';
    consultationMode: 'In-Person' | 'Video';
    consultationFee: number;
    createdAt: string;
    updatedAt: string;
    rescheduledFrom?: string;
}

export interface PaymentStatus {
    status: 'PENDING' | 'SUCCESS' | 'FAILED' | 'REFUNDED';
}

export interface Payment {
    paymentId: string;
    appointmentId: string;
    patientId: string;
    doctorId: string;
    amount: number;
    currency: string;
    paymentMethod: string;
    paymentGateway: string;
    transactionId: string;
    status: PaymentStatus['status'];
    invoiceId: string;
    invoiceUrl: string;
    paidAt: string;
    createdAt: string;
}

export interface DoctorSlot {
    slotId: string;
    doctorId: string;
    date: string;
    startTime: string;
    endTime: string;
    isAvailable: boolean;
    price: number;
    queueEnabled: boolean;
    pricingType: 'Standard' | 'Peak' | 'Off-Peak';
}

export interface Doctor {
    doctorId: string;
    name: string;
    specialty: string;
    rating: number;
    experience: number;
    availability: string;
    consultationFee: number;
    photoUrl: string;
    consultationMode: ('In-Person' | 'Video')[];
}

export interface RecommendationInput {
    symptoms: string;
    patientHistorySummary?: string;
    preferredConsultationMode?: 'In-Person' | 'Video';
    preferredTime?: string;
    specialtyHint?: string;
}
