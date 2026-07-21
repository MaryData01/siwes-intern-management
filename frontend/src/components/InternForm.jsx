/**
 * InternForm — declared OUTSIDE InternsTab so React keeps stable component
 * identity between re-renders. This prevents focus loss on every keystroke.
 */
import React from 'react';

const INP = {
  width: '100%', padding: '10px 12px', border: '1px solid #e2e8f0',
  borderRadius: '8px', fontSize: '0.9rem', boxSizing: 'border-box', fontFamily: 'inherit',
};
const LBL = {
  fontSize: '0.82rem', fontWeight: 600, color: '#475569', display: 'block', marginBottom: '5px',
};

const SEX_OPTIONS   = ['', 'Male', 'Female'];
const LEVEL_OPTIONS = ['', '100 Level', '200 Level', '300 Level', '400 Level', '500 Level', 'HND 1', 'HND 2', 'ND 1', 'ND 2'];

const Field = ({ label, required, children }) => (
  <div>
    <label style={LBL}>{label}{required && ' *'}</label>
    {children}
  </div>
);

const InternForm = ({ values, onChange, onSubmit, onCancel, submitting, isEdit }) => (
  <form onSubmit={onSubmit} autoComplete="off">
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(190px, 1fr))', gap: '14px', marginBottom: '18px' }}>

      <Field label="First Name" required>
        <input style={INP} value={values.first_name}
          onChange={e => onChange('first_name', e.target.value)} required />
      </Field>

      <Field label="Middle Name (Optional)">
        <input style={INP} placeholder="Leave blank if none" value={values.middle_name}
          onChange={e => onChange('middle_name', e.target.value)} />
      </Field>

      <Field label="Surname" required>
        <input style={INP} value={values.surname}
          onChange={e => onChange('surname', e.target.value)} required />
      </Field>

      <Field label="Sex">
        <select style={INP} value={values.sex} onChange={e => onChange('sex', e.target.value)}>
          {SEX_OPTIONS.map(o => <option key={o} value={o}>{o || '-- Select --'}</option>)}
        </select>
      </Field>

      <Field label="Phone Number" required>
        <input style={INP} placeholder="e.g. 08011112222" value={values.phone}
          onChange={e => onChange('phone', e.target.value)} required />
        {!isEdit && (
          <small style={{ color: '#64748b', fontSize: '0.75rem' }}>Surname will be default password</small>
        )}
      </Field>

      <Field label="Email Address">
        <input type="email" style={INP} placeholder="Optional" value={values.email_address}
          onChange={e => onChange('email_address', e.target.value)} />
      </Field>

      <Field label="School / Institution" required>
        <input style={INP} value={values.school}
          onChange={e => onChange('school', e.target.value)} required />
      </Field>

      <Field label="Course of Study" required>
        <input style={INP} value={values.course_of_study}
          onChange={e => onChange('course_of_study', e.target.value)} required />
      </Field>

      <Field label="Level">
        <select style={INP} value={values.level} onChange={e => onChange('level', e.target.value)}>
          {LEVEL_OPTIONS.map(o => <option key={o} value={o}>{o || '-- Select --'}</option>)}
        </select>
      </Field>

      <Field label="Area of Specialization" required>
        <input style={INP} value={values.specialization}
          onChange={e => onChange('specialization', e.target.value)} required />
      </Field>

      <Field label="Start Date">
        <input type="date" style={INP}
          value={values.start_date}
          min="2020-01-01" max="2035-12-31"
          onChange={e => onChange('start_date', e.target.value)} />
      </Field>

      <Field label="End Date">
        <input type="date" style={INP}
          value={values.end_date}
          min="2020-01-01" max="2035-12-31"
          onChange={e => onChange('end_date', e.target.value)} />
      </Field>
    </div>

    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
      <button type="button" style={{ padding: '10px 20px', border: '1px solid #e2e8f0', borderRadius: '8px', background: 'white', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 500 }}
        onClick={onCancel} disabled={submitting}>
        Cancel
      </button>
      <button type="submit" style={{ padding: '10px 24px', background: '#1e3a8a', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontFamily: 'inherit', fontWeight: 600 }}
        disabled={submitting}>
        {submitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Register Intern'}
      </button>
    </div>
  </form>
);

export default InternForm;
