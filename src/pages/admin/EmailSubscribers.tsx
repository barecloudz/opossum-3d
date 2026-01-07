import { useState, useEffect } from 'react';
import { Search, Download, Mail, UserX, UserCheck, Users } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import Badge from '../../components/ui/Badge';
import { supabase } from '../../lib/supabase';
import { useToast } from '../../components/ui/Toast';
import type { EmailSubscriber } from '../../types';

export default function AdminEmailSubscribers() {
  const [subscribers, setSubscribers] = useState<EmailSubscriber[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState<'all' | 'subscribed' | 'unsubscribed'>('all');
  const { addToast } = useToast();

  useEffect(() => {
    fetchSubscribers();
  }, []);

  const fetchSubscribers = async () => {
    try {
      const { data, error } = await supabase
        .from('email_subscribers')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setSubscribers(data || []);
    } catch (err) {
      console.error('Error fetching subscribers:', err);
      addToast('Failed to load subscribers', 'error');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleSubscription = async (subscriber: EmailSubscriber) => {
    try {
      const { error } = await supabase
        .from('email_subscribers')
        .update({
          is_subscribed: !subscriber.is_subscribed,
          unsubscribed_at: subscriber.is_subscribed ? new Date().toISOString() : null,
        })
        .eq('id', subscriber.id);

      if (error) throw error;

      addToast(
        subscriber.is_subscribed ? 'Subscriber unsubscribed' : 'Subscriber resubscribed',
        'success'
      );
      fetchSubscribers();
    } catch (err) {
      console.error('Error updating subscriber:', err);
      addToast('Failed to update subscriber', 'error');
    }
  };

  const exportToCSV = () => {
    const filteredSubs = getFilteredSubscribers();
    const headers = ['Email', 'First Name', 'Last Name', 'Source', 'Status', 'Subscribed Date'];
    const rows = filteredSubs.map((s) => [
      s.email,
      s.first_name || '',
      s.last_name || '',
      s.source,
      s.is_subscribed ? 'Subscribed' : 'Unsubscribed',
      new Date(s.subscribed_at).toLocaleDateString(),
    ]);

    const csvContent = [headers, ...rows].map((row) => row.join(',')).join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `subscribers-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
    URL.revokeObjectURL(url);

    addToast('Subscribers exported successfully', 'success');
  };

  const getFilteredSubscribers = () => {
    return subscribers.filter((sub) => {
      const matchesSearch =
        sub.email.toLowerCase().includes(search.toLowerCase()) ||
        (sub.first_name?.toLowerCase() || '').includes(search.toLowerCase()) ||
        (sub.last_name?.toLowerCase() || '').includes(search.toLowerCase());

      const matchesFilter =
        filter === 'all' ||
        (filter === 'subscribed' && sub.is_subscribed) ||
        (filter === 'unsubscribed' && !sub.is_subscribed);

      return matchesSearch && matchesFilter;
    });
  };

  const filteredSubscribers = getFilteredSubscribers();
  const stats = {
    total: subscribers.length,
    subscribed: subscribers.filter((s) => s.is_subscribed).length,
    unsubscribed: subscribers.filter((s) => !s.is_subscribed).length,
  };

  const getSourceBadge = (source: string) => {
    const variants: Record<string, 'success' | 'info' | 'warning' | 'default'> = {
      checkout: 'success',
      register: 'info',
      footer: 'warning',
      popup: 'default',
    };
    return <Badge variant={variants[source] || 'default'}>{source}</Badge>;
  };

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div>
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Email Subscribers</h1>
          <p className="text-gray-400 mt-1">Manage your marketing email list</p>
        </div>
        <Button onClick={exportToCSV} variant="outline">
          <Download className="h-5 w-5 mr-2" />
          Export CSV
        </Button>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-8">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-brand-neon/20 rounded-lg flex items-center justify-center">
              <Users className="h-6 w-6 text-brand-neon" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.total}</p>
              <p className="text-gray-400 text-sm">Total Subscribers</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-500/20 rounded-lg flex items-center justify-center">
              <UserCheck className="h-6 w-6 text-green-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.subscribed}</p>
              <p className="text-gray-400 text-sm">Active</p>
            </div>
          </div>
        </Card>
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-red-500/20 rounded-lg flex items-center justify-center">
              <UserX className="h-6 w-6 text-red-400" />
            </div>
            <div>
              <p className="text-2xl font-bold text-white">{stats.unsubscribed}</p>
              <p className="text-gray-400 text-sm">Unsubscribed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-4 mb-6">
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
          <Input
            type="text"
            placeholder="Search by email or name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <select
          value={filter}
          onChange={(e) => setFilter(e.target.value as typeof filter)}
          className="px-4 py-2 bg-brand-black border border-brand-gray rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-brand-neon"
        >
          <option value="all">All Subscribers</option>
          <option value="subscribed">Active Only</option>
          <option value="unsubscribed">Unsubscribed Only</option>
        </select>
      </div>

      {/* Subscribers List */}
      {filteredSubscribers.length === 0 ? (
        <Card>
          <div className="text-center py-12">
            <Mail className="h-16 w-16 text-gray-600 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">No subscribers yet</h3>
            <p className="text-gray-400">
              Subscribers will appear here when customers sign up for marketing emails
            </p>
          </div>
        </Card>
      ) : (
        <Card padding="none">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-brand-gray">
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                    Email
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                    Name
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                    Source
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                    Status
                  </th>
                  <th className="px-6 py-4 text-left text-sm font-medium text-gray-400">
                    Date
                  </th>
                  <th className="px-6 py-4 text-right text-sm font-medium text-gray-400">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-brand-gray">
                {filteredSubscribers.map((subscriber) => (
                  <tr key={subscriber.id} className="hover:bg-brand-gray/30">
                    <td className="px-6 py-4 text-white">{subscriber.email}</td>
                    <td className="px-6 py-4 text-gray-400">
                      {subscriber.first_name || subscriber.last_name
                        ? `${subscriber.first_name || ''} ${subscriber.last_name || ''}`.trim()
                        : '-'}
                    </td>
                    <td className="px-6 py-4">{getSourceBadge(subscriber.source)}</td>
                    <td className="px-6 py-4">
                      <Badge variant={subscriber.is_subscribed ? 'success' : 'danger'}>
                        {subscriber.is_subscribed ? 'Subscribed' : 'Unsubscribed'}
                      </Badge>
                    </td>
                    <td className="px-6 py-4 text-gray-400">
                      {new Date(subscriber.subscribed_at).toLocaleDateString()}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <Button
                        size="sm"
                        variant={subscriber.is_subscribed ? 'ghost' : 'secondary'}
                        onClick={() => toggleSubscription(subscriber)}
                      >
                        {subscriber.is_subscribed ? (
                          <>
                            <UserX className="h-4 w-4 mr-1" />
                            Unsubscribe
                          </>
                        ) : (
                          <>
                            <UserCheck className="h-4 w-4 mr-1" />
                            Resubscribe
                          </>
                        )}
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}
