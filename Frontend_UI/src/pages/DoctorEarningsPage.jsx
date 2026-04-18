import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getDoctors } from '../services/doctorService';
import { fetchDoctorEarningsSummary } from '../services/platformApi';
import { resolveCurrentDoctor } from '../utils/currentDoctor';

export default function DoctorEarningsPage({ auth }) {
  const [earnings, setEarnings] = useState({
    totalEarnings: 0,
    currentMonthEarnings: 0,
    completedPaidConsultations: 0,
    monthlyHistory: []
  });

  useEffect(() => {
    let mounted = true;

    const load = async () => {
      const doctorList = await getDoctors().catch(() => []);
      const currentDoctor = resolveCurrentDoctor(Array.isArray(doctorList) ? doctorList : []).doctor;
      if (!currentDoctor?._id) {
        return;
      }

      const summary = await fetchDoctorEarningsSummary(auth, currentDoctor._id).catch(() => ({
        totalEarnings: 0,
        currentMonthEarnings: 0,
        completedPaidConsultations: 0,
        monthlyHistory: []
      }));

      if (!mounted) return;
      setEarnings(summary);
    };

    load();

    return () => {
      mounted = false;
    };
  }, [auth]);

  const highestMonthlyAmount = Math.max(...(earnings.monthlyHistory || []).map((row) => Number(row.amount || 0)), 1);

  return (
    <div className="space-y-6 animate-fade-up">
      <section className="panel p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <Link to="/doctor/dashboard" className="text-sm font-semibold text-brand-700 hover:text-brand-800">
              Back to dashboard
            </Link>
            <h1 className="mt-3 text-3xl font-black tracking-tight text-slate-900">Doctor earnings and revenue</h1>
            <p className="mt-2 text-sm text-slate-600">Monthly and cumulative revenue for your completed paid consultations.</p>
          </div>
        </div>
      </section>

      <section className="grid gap-4 md:grid-cols-3">
        <MetricCard label="Total Earnings" value={`LKR ${Number(earnings.totalEarnings || 0).toFixed(2)}`} />
        <MetricCard label="Current Month" value={`LKR ${Number(earnings.currentMonthEarnings || 0).toFixed(2)}`} />
        <MetricCard label="Paid Consultations" value={String(earnings.completedPaidConsultations || 0)} />
      </section>

      <section className="panel p-6">
        <h2 className="text-2xl font-semibold text-slate-900">Earnings history by month</h2>
        <div className="mt-4 space-y-3">
          {(earnings.monthlyHistory || []).length ? (
            earnings.monthlyHistory.map((item) => {
              const width = Math.max(8, Math.round((Number(item.amount || 0) / highestMonthlyAmount) * 100));
              return (
              <article key={item.month} className="rounded-2xl border border-brand-100 bg-brand-50/40 px-4 py-3">
                <div className="flex items-center justify-between">
                <p className="font-semibold text-slate-800">{item.month}</p>
                <p className="text-sm font-bold text-brand-700">LKR {Number(item.amount || 0).toFixed(2)}</p>
                </div>
                <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-white">
                  <div className="h-full rounded-full bg-gradient-to-r from-brand-500 to-bondi" style={{ width: `${width}%` }} />
                </div>
              </article>
            )})
          ) : (
            <p className="text-sm text-slate-500">No earnings history is available yet.</p>
          )}
        </div>
      </section>
    </div>
  );
}

function MetricCard({ label, value }) {
  return (
    <div className="panel p-5">
      <p className="text-xs font-bold uppercase tracking-[0.28em] text-brand-600">{label}</p>
      <p className="mt-2 text-2xl font-black text-slate-900">{value}</p>
    </div>
  );
}
