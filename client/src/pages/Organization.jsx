import { useEffect, useState } from 'react';
import { api } from '../api/client';
import { Button, EmptyState, Field, Input, SectionCard, StatusPill, Select } from '../components/UI';

const tabs = ['departments', 'categories', 'employees'];

export default function Organization() {
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departmentForm, setDepartmentForm] = useState({ name: '' });
  const [categoryForm, setCategoryForm] = useState({ name: '', type: 'Asset' });
  const [roleForm, setRoleForm] = useState({ role: 'Employee', department: '' });

  const load = async () => {
    const [deptData, catData, empData] = await Promise.all([api.departments(), api.categories(), api.employees()]);
    setDepartments(deptData);
    setCategories(catData);
    setEmployees(empData);
  };

  useEffect(() => {
    load();
  }, []);

  const createDepartment = async (event) => {
    event.preventDefault();
    await api.saveDepartment(departmentForm);
    setDepartmentForm({ name: '' });
    load();
  };

  const createCategory = async (event) => {
    event.preventDefault();
    await api.saveCategory(categoryForm);
    setCategoryForm({ name: '', type: 'Asset' });
    load();
  };

  const assignRole = async (employeeId) => {
    await api.updateEmployeeRole(employeeId, roleForm);
    load();
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Organization setup" subtitle="Admin-only workspace for departments, categories, and employee roles">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold ${activeTab === tab ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600'}`}
            >
              {tab}
            </button>
          ))}
        </div>
      </SectionCard>

      {activeTab === 'departments' && (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <SectionCard title="Create department">
            <form className="space-y-4" onSubmit={createDepartment}>
              <Field label="Department name">
                <Input value={departmentForm.name} onChange={(e) => setDepartmentForm({ name: e.target.value })} />
              </Field>
              <Button type="submit">Add department</Button>
            </form>
          </SectionCard>
          <SectionCard title="Department directory">
            {departments.length ? departments.map((department) => (
              <div key={department._id} className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-semibold">{department.name}</p>
                  <p className="text-sm text-slate-500">Head: {department.head?.name || 'Unassigned'}</p>
                </div>
                <StatusPill tone={department.status === 'Active' ? 'green' : 'slate'}>{department.status}</StatusPill>
              </div>
            )) : <EmptyState title="No departments" description="Create departments for the organization setup workflow." />}
          </SectionCard>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid gap-6 xl:grid-cols-[0.8fr_1.2fr]">
          <SectionCard title="Create category">
            <form className="space-y-4" onSubmit={createCategory}>
              <Field label="Category name">
                <Input value={categoryForm.name} onChange={(e) => setCategoryForm({ ...categoryForm, name: e.target.value })} />
              </Field>
              <Field label="Type">
                <Select value={categoryForm.type} onChange={(e) => setCategoryForm({ ...categoryForm, type: e.target.value })}>
                  <option value="Asset">Asset</option>
                  <option value="Resource">Resource</option>
                </Select>
              </Field>
              <Button type="submit">Add category</Button>
            </form>
          </SectionCard>
          <SectionCard title="Asset categories">
            {categories.length ? categories.map((category) => (
              <div key={category._id} className="mb-3 flex items-center justify-between rounded-2xl border border-slate-200 p-4">
                <div>
                  <p className="font-semibold">{category.name}</p>
                  <p className="text-sm text-slate-500">{category.type}</p>
                </div>
                <StatusPill tone={category.type === 'Resource' ? 'amber' : 'teal'}>{category.status}</StatusPill>
              </div>
            )) : <EmptyState title="No categories" description="Register asset and resource categories here." />}
          </SectionCard>
        </div>
      )}

      {activeTab === 'employees' && (
        <SectionCard title="Employee directory" subtitle="Assign roles and departments">
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Role">
              <Select value={roleForm.role} onChange={(e) => setRoleForm({ ...roleForm, role: e.target.value })}>
                <option>Employee</option>
                <option>Department Head</option>
                <option>Asset Manager</option>
                <option>Admin</option>
              </Select>
            </Field>
            <Field label="Department">
              <Select value={roleForm.department} onChange={(e) => setRoleForm({ ...roleForm, department: e.target.value })}>
                <option value="">Select department</option>
                {departments.map((department) => <option key={department._id} value={department._id}>{department.name}</option>)}
              </Select>
            </Field>
            <div className="flex items-end">
              <Button variant="secondary" className="w-full" onClick={() => setRoleForm({ role: 'Employee', department: '' })}>
                Reset role form
              </Button>
            </div>
          </div>
          <div className="mt-5 space-y-3">
            {employees.map((employee) => (
              <div key={employee._id} className="flex flex-col gap-3 rounded-2xl border border-slate-200 p-4 md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="font-semibold text-slate-900">{employee.name}</p>
                  <p className="text-sm text-slate-500">{employee.email}</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                  <StatusPill tone={employee.role === 'Admin' ? 'purple' : employee.role === 'Asset Manager' ? 'teal' : employee.role === 'Department Head' ? 'amber' : 'blue'}>{employee.role}</StatusPill>
                  <span className="text-sm text-slate-500">{employee.department?.name || 'No department'}</span>
                  <Button variant="outline" onClick={() => assignRole(employee._id)}>Apply selected role</Button>
                </div>
              </div>
            ))}
          </div>
        </SectionCard>
      )}
    </div>
  );
}