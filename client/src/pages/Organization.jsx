import { useEffect, useMemo, useState } from 'react';
import { api } from '../api/client';
import { Button, EmptyState, Field, Input, SectionCard, Select, StatusPill, Textarea } from '../components/UI';

const tabs = [
  { id: 'departments', label: 'Departments' },
  { id: 'categories', label: 'Categories' },
  { id: 'employees', label: 'Employee' },
];

const emptyDepartmentForm = { name: '', head: '', parentDepartment: '', status: 'Active' };
const emptyCategoryForm = { name: '', type: 'Asset', status: 'Active', warrantyPeriodMonths: '', maintenanceCycleMonths: '', notes: '' };

export default function Organization() {
  const [activeTab, setActiveTab] = useState('departments');
  const [departments, setDepartments] = useState([]);
  const [categories, setCategories] = useState([]);
  const [employees, setEmployees] = useState([]);
  const [departmentForm, setDepartmentForm] = useState(emptyDepartmentForm);
  const [categoryForm, setCategoryForm] = useState(emptyCategoryForm);
  const [departmentEditingId, setDepartmentEditingId] = useState(null);
  const [categoryEditingId, setCategoryEditingId] = useState(null);
  const [employeeDrafts, setEmployeeDrafts] = useState({});

  const load = async () => {
    const [deptData, catData, empData] = await Promise.all([api.departments(), api.categories(), api.employees()]);
    setDepartments(deptData);
    setCategories(catData);
    setEmployees(empData);
    setEmployeeDrafts(
      empData.reduce((accumulator, employee) => {
        accumulator[employee._id] = {
          role: employee.role,
          department: employee.department?._id || '',
          status: employee.status || 'Active',
        };
        return accumulator;
      }, {})
    );
  };

  useEffect(() => {
    load();
  }, []);

  const departmentOptions = useMemo(() => departments.filter((department) => department._id !== departmentEditingId), [departments, departmentEditingId]);

  const departmentPayload = () => ({
    name: departmentForm.name,
    head: departmentForm.head || null,
    parentDepartment: departmentForm.parentDepartment || null,
    status: departmentForm.status,
  });

  const categoryPayload = () => ({
    name: categoryForm.name,
    type: categoryForm.type,
    status: categoryForm.status,
    customFields: {
      warrantyPeriodMonths: categoryForm.warrantyPeriodMonths ? Number(categoryForm.warrantyPeriodMonths) : null,
      maintenanceCycleMonths: categoryForm.maintenanceCycleMonths ? Number(categoryForm.maintenanceCycleMonths) : null,
      notes: categoryForm.notes,
    },
  });

  const resetDepartmentForm = () => {
    setDepartmentForm(emptyDepartmentForm);
    setDepartmentEditingId(null);
  };

  const resetCategoryForm = () => {
    setCategoryForm(emptyCategoryForm);
    setCategoryEditingId(null);
  };

  const submitDepartment = async (event) => {
    event.preventDefault();
    if (departmentEditingId) {
      await api.updateDepartment(departmentEditingId, departmentPayload());
    } else {
      await api.saveDepartment(departmentPayload());
    }
    resetDepartmentForm();
    load();
  };

  const submitCategory = async (event) => {
    event.preventDefault();
    if (categoryEditingId) {
      await api.updateCategory(categoryEditingId, categoryPayload());
    } else {
      await api.saveCategory(categoryPayload());
    }
    resetCategoryForm();
    load();
  };

  const saveEmployee = async (employeeId) => {
    await api.updateEmployeeRole(employeeId, employeeDrafts[employeeId]);
    load();
  };

  const editDepartment = (department) => {
    setDepartmentEditingId(department._id);
    setDepartmentForm({
      name: department.name || '',
      head: department.head?._id || '',
      parentDepartment: department.parentDepartment?._id || '',
      status: department.status || 'Active',
    });
  };

  const editCategory = (category) => {
    setCategoryEditingId(category._id);
    setCategoryForm({
      name: category.name || '',
      type: category.type || 'Asset',
      status: category.status || 'Active',
      warrantyPeriodMonths: category.customFields?.warrantyPeriodMonths ?? '',
      maintenanceCycleMonths: category.customFields?.maintenanceCycleMonths ?? '',
      notes: category.customFields?.notes || '',
    });
  };

  return (
    <div className="space-y-6">
      <SectionCard title="Organization setup" subtitle="Admin-only master data for departments, categories, and employees">
        <div className="flex flex-wrap gap-2">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={`rounded-2xl px-4 py-2 text-sm font-semibold transition ${activeTab === tab.id ? 'bg-slate-900 text-white' : 'bg-slate-100 text-slate-600 hover:bg-slate-200'}`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </SectionCard>

      {activeTab === 'departments' && (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title={departmentEditingId ? 'Edit department' : 'Create department'} subtitle="Create, edit, or deactivate departments and assign hierarchy">
            <form className="space-y-4" onSubmit={submitDepartment}>
              <Field label="Department name">
                <Input value={departmentForm.name} onChange={(event) => setDepartmentForm({ ...departmentForm, name: event.target.value })} />
              </Field>
              <Field label="Department head">
                <Select value={departmentForm.head} onChange={(event) => setDepartmentForm({ ...departmentForm, head: event.target.value })}>
                  <option value="">No head assigned</option>
                  {employees.map((employee) => (
                    <option key={employee._id} value={employee._id}>
                      {employee.name} - {employee.email}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Parent department">
                <Select value={departmentForm.parentDepartment} onChange={(event) => setDepartmentForm({ ...departmentForm, parentDepartment: event.target.value })}>
                  <option value="">No parent department</option>
                  {departmentOptions.map((department) => (
                    <option key={department._id} value={department._id}>
                      {department.name}
                    </option>
                  ))}
                </Select>
              </Field>
              <Field label="Status">
                <Select value={departmentForm.status} onChange={(event) => setDepartmentForm({ ...departmentForm, status: event.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Select>
              </Field>
              <div className="flex gap-3">
                <Button type="submit">{departmentEditingId ? 'Update department' : 'Add department'}</Button>
                {departmentEditingId ? (
                  <Button type="button" variant="secondary" onClick={resetDepartmentForm}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Department directory" subtitle="Active and inactive departments with hierarchy and head assignment">
            {departments.length ? (
              <div className="space-y-3">
                {departments.map((department) => (
                  <div key={department._id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{department.name}</p>
                        <p className="text-sm text-slate-500">
                          Head: {department.head?.name || 'Unassigned'} · Parent: {department.parentDepartment?.name || 'None'}
                        </p>
                      </div>
                      <StatusPill tone={department.status === 'Active' ? 'green' : 'slate'}>{department.status}</StatusPill>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => editDepartment(department)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant={department.status === 'Active' ? 'secondary' : 'accent'}
                        onClick={async () => {
                          await api.updateDepartment(department._id, {
                            name: department.name,
                            head: department.head?._id || null,
                            parentDepartment: department.parentDepartment?._id || null,
                            status: department.status === 'Active' ? 'Inactive' : 'Active',
                          });
                          load();
                        }}
                      >
                        {department.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No departments" description="Create departments that other records can reference." />
            )}
          </SectionCard>
        </div>
      )}

      {activeTab === 'categories' && (
        <div className="grid gap-6 xl:grid-cols-[0.95fr_1.05fr]">
          <SectionCard title={categoryEditingId ? 'Edit category' : 'Create category'} subtitle="Maintain asset and resource categories with optional metadata">
            <form className="space-y-4" onSubmit={submitCategory}>
              <Field label="Category name">
                <Input value={categoryForm.name} onChange={(event) => setCategoryForm({ ...categoryForm, name: event.target.value })} />
              </Field>
              <Field label="Category type">
                <Select value={categoryForm.type} onChange={(event) => setCategoryForm({ ...categoryForm, type: event.target.value })}>
                  <option value="Asset">Asset</option>
                  <option value="Resource">Resource</option>
                </Select>
              </Field>
              <div className="grid gap-4 md:grid-cols-2">
                <Field label="Warranty period (months)">
                  <Input
                    type="number"
                    value={categoryForm.warrantyPeriodMonths}
                    onChange={(event) => setCategoryForm({ ...categoryForm, warrantyPeriodMonths: event.target.value })}
                  />
                </Field>
                <Field label="Maintenance cycle (months)">
                  <Input
                    type="number"
                    value={categoryForm.maintenanceCycleMonths}
                    onChange={(event) => setCategoryForm({ ...categoryForm, maintenanceCycleMonths: event.target.value })}
                  />
                </Field>
              </div>
              <Field label="Category notes">
                <Textarea rows="4" value={categoryForm.notes} onChange={(event) => setCategoryForm({ ...categoryForm, notes: event.target.value })} />
              </Field>
              <Field label="Status">
                <Select value={categoryForm.status} onChange={(event) => setCategoryForm({ ...categoryForm, status: event.target.value })}>
                  <option value="Active">Active</option>
                  <option value="Inactive">Inactive</option>
                </Select>
              </Field>
              <div className="flex gap-3">
                <Button type="submit">{categoryEditingId ? 'Update category' : 'Add category'}</Button>
                {categoryEditingId ? (
                  <Button type="button" variant="secondary" onClick={resetCategoryForm}>
                    Cancel
                  </Button>
                ) : null}
              </div>
            </form>
          </SectionCard>

          <SectionCard title="Category directory" subtitle="Electronics, furniture, vehicles, and custom fields">
            {categories.length ? (
              <div className="space-y-3">
                {categories.map((category) => (
                  <div key={category._id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{category.name}</p>
                        <p className="text-sm text-slate-500">
                          {category.type} · Warranty: {category.customFields?.warrantyPeriodMonths || 'n/a'} months · Cycle: {category.customFields?.maintenanceCycleMonths || 'n/a'} months
                        </p>
                        {category.customFields?.notes ? <p className="mt-1 text-xs text-slate-400">{category.customFields.notes}</p> : null}
                      </div>
                      <StatusPill tone={category.status === 'Active' ? 'teal' : 'slate'}>{category.status}</StatusPill>
                    </div>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <Button type="button" variant="outline" onClick={() => editCategory(category)}>
                        Edit
                      </Button>
                      <Button
                        type="button"
                        variant={category.status === 'Active' ? 'secondary' : 'accent'}
                        onClick={async () => {
                          await api.updateCategory(category._id, {
                            name: category.name,
                            type: category.type,
                            status: category.status === 'Active' ? 'Inactive' : 'Active',
                            customFields: category.customFields || {},
                          });
                          load();
                        }}
                      >
                        {category.status === 'Active' ? 'Deactivate' : 'Activate'}
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState title="No categories" description="Register asset and resource categories here." />
            )}
          </SectionCard>
        </div>
      )}

      {activeTab === 'employees' && (
        <SectionCard title="Employee directory" subtitle="Only admins can promote staff or deactivate accounts">
          <div className="space-y-3">
            {employees.length ? (
              employees.map((employee) => {
                const draft = employeeDrafts[employee._id] || { role: employee.role, department: employee.department?._id || '', status: employee.status || 'Active' };
                return (
                  <div key={employee._id} className="rounded-3xl border border-slate-200 p-4">
                    <div className="grid gap-4 md:grid-cols-[1.1fr_0.8fr_0.8fr_0.8fr_auto] md:items-end">
                      <div>
                        <p className="font-semibold text-slate-900">{employee.name}</p>
                        <p className="text-sm text-slate-500">{employee.email}</p>
                      </div>
                      <Field label="Department">
                        <Select
                          value={draft.department}
                          onChange={(event) =>
                            setEmployeeDrafts((current) => ({
                              ...current,
                              [employee._id]: { ...draft, department: event.target.value },
                            }))
                          }
                        >
                          <option value="">No department</option>
                          {departments.map((department) => (
                            <option key={department._id} value={department._id}>
                              {department.name}
                            </option>
                          ))}
                        </Select>
                      </Field>
                      <Field label="Role">
                        <Select
                          value={draft.role}
                          onChange={(event) =>
                            setEmployeeDrafts((current) => ({
                              ...current,
                              [employee._id]: { ...draft, role: event.target.value },
                            }))
                          }
                        >
                          <option value="Employee">Employee</option>
                          <option value="Department Head">Department Head</option>
                          <option value="Asset Manager">Asset Manager</option>
                          <option value="Admin">Admin</option>
                        </Select>
                      </Field>
                      <Field label="Status">
                        <Select
                          value={draft.status}
                          onChange={(event) =>
                            setEmployeeDrafts((current) => ({
                              ...current,
                              [employee._id]: { ...draft, status: event.target.value },
                            }))
                          }
                        >
                          <option value="Active">Active</option>
                          <option value="Inactive">Inactive</option>
                        </Select>
                      </Field>
                      <Button type="button" onClick={() => saveEmployee(employee._id)}>
                        Save
                      </Button>
                    </div>
                    <div className="mt-4 flex flex-wrap items-center gap-3">
                      <StatusPill tone={employee.role === 'Admin' ? 'purple' : employee.role === 'Asset Manager' ? 'teal' : employee.role === 'Department Head' ? 'amber' : 'blue'}>
                        {employee.role}
                      </StatusPill>
                      <StatusPill tone={employee.status === 'Active' ? 'green' : 'slate'}>{employee.status || 'Active'}</StatusPill>
                      <span className="text-sm text-slate-500">{employee.department?.name || 'No department'}</span>
                    </div>
                  </div>
                );
              })
            ) : (
              <EmptyState title="No employees" description="Employee records created through signup appear here once the admin loads them." />
            )}
          </div>
        </SectionCard>
      )}
    </div>
  );
}