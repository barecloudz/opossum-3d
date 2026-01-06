import { useState } from 'react';
import { Search, Users, Mail } from 'lucide-react';
import Input from '../../components/ui/Input';
import Card from '../../components/ui/Card';
import Badge from '../../components/ui/Badge';
import Spinner from '../../components/ui/Spinner';
import { formatDate } from '../../lib/utils';
import { useCustomers } from '../../hooks/useAdmin';

export default function AdminCustomers() {
  const { customers, isLoading } = useCustomers();
  const [search, setSearch] = useState('');

  const filteredCustomers = customers.filter(
    (customer) =>
      customer.email.toLowerCase().includes(search.toLowerCase()) ||
      customer.first_name?.toLowerCase().includes(search.toLowerCase()) ||
      customer.last_name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div>
      <h1 className="text-3xl font-bold text-white mb-8">Customers</h1>

      {/* Search */}
      <div className="mb-6">
        <div className="relative max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search customers..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
      </div>

      {/* Customers Table */}
      <Card padding="none">
        {isLoading ? (
          <div className="flex justify-center py-12">
            <Spinner size="lg" />
          </div>
        ) : filteredCustomers.length === 0 ? (
          <div className="text-center py-12">
            <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
            <p className="text-gray-400">No customers found</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-gray">
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Customer</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Email</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Marketing</th>
                  <th className="text-left py-3 px-4 text-gray-400 font-medium">Joined</th>
                </tr>
              </thead>
              <tbody>
                {filteredCustomers.map((customer) => (
                  <tr
                    key={customer.id}
                    className="border-b border-brand-gray/50 hover:bg-brand-gray/20"
                  >
                    <td className="py-3 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 bg-brand-emerald-dark rounded-full flex items-center justify-center">
                          <span className="text-brand-neon font-medium">
                            {customer.first_name?.[0] || customer.email[0].toUpperCase()}
                          </span>
                        </div>
                        <span className="text-white font-medium">
                          {customer.first_name
                            ? `${customer.first_name} ${customer.last_name || ''}`
                            : 'Unknown'}
                        </span>
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-400">{customer.email}</td>
                    <td className="py-3 px-4">
                      {customer.marketing_opt_in ? (
                        <Badge variant="success">
                          <Mail className="h-3 w-3 mr-1" />
                          Subscribed
                        </Badge>
                      ) : (
                        <Badge variant="default">Not subscribed</Badge>
                      )}
                    </td>
                    <td className="py-3 px-4 text-gray-400">{formatDate(customer.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
