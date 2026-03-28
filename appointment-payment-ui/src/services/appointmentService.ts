import type { Appointment, RecommendationInput, Doctor } from '../models/types';
import { mockDoctors } from './mockData';

class AppointmentService {
    private appointments: Appointment[] = [];

    async getDoctors(): Promise<Doctor[]> {
        return new Promise((resolve) => {
            setTimeout(() => resolve(mockDoctors), 500);
        });
    }

    async recommendDoctors(input: RecommendationInput): Promise<Doctor[]> {
        return new Promise((resolve) => {
            setTimeout(() => {
                const filtered = mockDoctors.filter(d =>
                    d.specialty.toLowerCase().includes(input.symptoms.toLowerCase()) ||
                    input.symptoms.toLowerCase().includes(d.specialty.toLowerCase())
                );
                resolve(filtered.length > 0 ? filtered : [mockDoctors[0]]);
            }, 1000);
        });
    }

    async bookAppointment(data: Partial<Appointment>): Promise<Appointment> {
        return new Promise((resolve) => {
            setTimeout(() => {
                const newAppointment: Appointment = {
                    appointmentId: `app-${Date.now()}`,
                    patientId: 'p1',
                    doctorId: data.doctorId!,
                    doctorName: data.doctorName!,
                    doctorSpecialty: data.doctorSpecialty!,
                    appointmentDate: data.appointmentDate!,
                    timeSlot: data.timeSlot!,
                    status: 'PENDING_PAYMENT',
                    symptoms: data.symptoms!,
                    paymentStatus: 'UNPAID',
                    consultationMode: data.consultationMode!,
                    consultationFee: data.consultationFee!,
                    createdAt: new Date().toISOString(),
                    updatedAt: new Date().toISOString(),
                    ...data
                };
                this.appointments.push(newAppointment);
                resolve(newAppointment);
            }, 1000);
        });
    }

    async getAppointments(): Promise<Appointment[]> {
        return Promise.resolve(this.appointments);
    }
}

export const appointmentService = new AppointmentService();
