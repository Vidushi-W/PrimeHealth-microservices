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
