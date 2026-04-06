import type { Doctor, DoctorSlot } from '../models/types';

export const mockDoctors: Doctor[] = [
    {
        doctorId: 'd1',
        name: 'Dr. Sarah Wilson',
        specialty: 'Cardiology',
        rating: 4.9,
        experience: 12,
        availability: 'Mon, Wed, Fri',
        consultationFee: 2500,
        photoUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&q=80&w=200&h=200',
        consultationMode: ['In-Person', 'Video']
    },
    {
        doctorId: 'd2',
        name: 'Dr. James Miller',
        specialty: 'Dermatology',
        rating: 4.7,
        experience: 8,
        availability: 'Tue, Thu, Sat',
        consultationFee: 1800,
        photoUrl: 'https://images.unsplash.com/photo-1612349317150-e413f6a5b16d?auto=format&fit=crop&q=80&w=200&h=200',
        consultationMode: ['In-Person']
    },
    {
        doctorId: 'd3',
        name: 'Dr. Emily Chen',
        specialty: 'Pediatrics',
        rating: 4.8,
        experience: 10,
        availability: 'Mon, Tue, Wed, Thu',
        consultationFee: 2000,
        photoUrl: 'https://images.unsplash.com/photo-1594824476967-48c8b964273f?auto=format&fit=crop&q=80&w=200&h=200',
        consultationMode: ['Video']
    }
];

export const mockSlots: DoctorSlot[] = [
    {
        slotId: 's1',
        doctorId: 'd1',
        date: '2026-03-30',
        startTime: '09:00',
        endTime: '09:30',
        isAvailable: true,
        price: 2500,
        queueEnabled: true,
        pricingType: 'Standard'
    },
    {
        slotId: 's2',
        doctorId: 'd1',
        date: '2026-03-30',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true,
        price: 2500,
        queueEnabled: true,
        pricingType: 'Standard'
    },
    {
        slotId: 's3',
        doctorId: 'd1',
        date: '2026-03-30',
        startTime: '18:00',
        endTime: '18:30',
        isAvailable: true,
        price: 3000,
        queueEnabled: true,
        pricingType: 'Peak'
    },
    {
        slotId: 's4',
        doctorId: 'd2',
        date: '2026-03-30',
        startTime: '09:00',
        endTime: '09:30',
        isAvailable: true,
        price: 1800,
        queueEnabled: true,
        pricingType: 'Standard'
    },
    {
        slotId: 's5',
        doctorId: 'd2',
        date: '2026-03-30',
        startTime: '10:00',
        endTime: '10:30',
        isAvailable: true,
        price: 1800,
        queueEnabled: true,
        pricingType: 'Standard'
    },
    {
        slotId: 's6',
        doctorId: 'd3',
        date: '2026-03-30',
        startTime: '14:00',
        endTime: '14:30',
        isAvailable: true,
        price: 2000,
        queueEnabled: true,
        pricingType: 'Standard'
    }
];
export const mockTodayAppointments = [
    {
        id: 'TKT-001',
        patientName: 'John Doe',
        time: '09:00 AM',
        status: 'Completed',
        type: 'General Checkup',
        fee: 2500
    },
    {
        id: 'TKT-002',
        patientName: 'Jane Smith',
        time: '09:30 AM',
        status: 'Completed',
        type: 'Heart Review',
        fee: 3000
    },
    {
        id: 'TKT-003',
        patientName: 'Alex Johnson',
        time: '10:00 AM',
        status: 'In Consultation',
        type: 'Follow-up',
        fee: 2500
    },
    {
        id: 'TKT-004',
        patientName: 'Michael Brown',
        time: '10:30 AM',
        status: 'Waiting',
        type: 'Echo Test',
        fee: 5000
    },
    {
        id: 'TKT-005',
        patientName: 'Sarah Davis',
        time: '11:00 AM',
        status: 'Waiting',
        type: 'ECG Analysis',
        fee: 2500
    }
];

export const mockEarnings = {
    dailyTotal: 16000,
    monthlyTotal: 450000,
    pendingSettlement: 12500,
    history: [
        { date: '2026-03-27', amount: 18500, appointments: 8 },
        { date: '2026-03-26', amount: 22000, appointments: 10 },
        { date: '2026-03-25', amount: 15500, appointments: 6 }
    ]
};
