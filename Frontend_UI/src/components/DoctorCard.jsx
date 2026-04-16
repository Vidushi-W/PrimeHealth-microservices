import { Link } from 'react-router-dom';

function DoctorCard({ doctor }) {
  return (
    <Link
      to={`/doctors/${doctor._id}`}
      className="group panel block p-6 transition hover:-translate-y-1 hover:border-brand-300"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.25em] text-brand-600">
            Doctor Profile
          </p>
          <h2 className="mt-2 text-xl font-semibold text-slate-900">{doctor.name}</h2>
          <p className="mt-2 text-sm text-slate-500">{doctor.email}</p>
        </div>
        <span className="rounded-lg bg-brand-50 px-3 py-1 text-xs font-semibold text-brand-700">
          {doctor.experience} yrs
        </span>
      </div>

      <div className="mt-6 flex items-center justify-between">
        <div>
          <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Specialization</p>
          <p className="mt-1 font-medium text-slate-700">{doctor.specialization}</p>
        </div>

        <div className="text-sm font-semibold text-brand-700 transition group-hover:translate-x-1">
          View details
        </div>
      </div>
    </Link>
  );
}

export default DoctorCard;
