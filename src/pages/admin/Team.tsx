import { useState } from 'react';
import { UserPlus, Shield, ShieldOff, Users, Search } from 'lucide-react';
import Card from '../../components/ui/Card';
import Button from '../../components/ui/Button';
import Badge from '../../components/ui/Badge';
import Input from '../../components/ui/Input';
import Spinner from '../../components/ui/Spinner';
import { useToast } from '../../components/ui/Toast';
import { useTeamMembers } from '../../hooks/useAdmin';
import { useAuthStore } from '../../store/authStore';
import { formatDate } from '../../lib/utils';

export default function AdminTeam() {
  const { teamMembers, allUsers, isLoading, promoteToAdmin, demoteToCustomer } = useTeamMembers();
  const { user: currentUser } = useAuthStore();
  const { addToast } = useToast();
  const [showAddModal, setShowAddModal] = useState(false);
  const [search, setSearch] = useState('');
  const [isProcessing, setIsProcessing] = useState<string | null>(null);

  // Filter out existing admins from the list of users that can be promoted
  const promotableUsers = allUsers.filter(
    (u) => u.role === 'customer' &&
    (u.email.toLowerCase().includes(search.toLowerCase()) ||
     u.first_name?.toLowerCase().includes(search.toLowerCase()) ||
     u.last_name?.toLowerCase().includes(search.toLowerCase()))
  );

  const handlePromote = async (userId: string, email: string) => {
    setIsProcessing(userId);
    try {
      await promoteToAdmin(userId);
      addToast(`${email} is now an admin`, 'success');
      setShowAddModal(false);
      setSearch('');
    } catch (err) {
      console.error('Error promoting user:', err);
      addToast('Failed to promote user', 'error');
    } finally {
      setIsProcessing(null);
    }
  };

  const handleDemote = async (userId: string, email: string) => {
    if (userId === currentUser?.id) {
      addToast("You can't remove your own admin access", 'error');
      return;
    }

    if (!confirm(`Remove admin access for ${email}?`)) return;

    setIsProcessing(userId);
    try {
      await demoteToCustomer(userId);
      addToast(`${email} is no longer an admin`, 'success');
    } catch (err) {
      console.error('Error demoting user:', err);
      addToast('Failed to remove admin access', 'error');
    } finally {
      setIsProcessing(null);
    }
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
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Team</h1>
          <p className="text-gray-400 mt-1">Manage admin access for your team</p>
        </div>
        <Button onClick={() => setShowAddModal(true)}>
          <UserPlus className="h-4 w-4 mr-2" />
          Add Team Member
        </Button>
      </div>

      {/* Team Members List */}
      {teamMembers.length === 0 ? (
        <Card className="text-center py-12">
          <Users className="h-12 w-12 text-gray-600 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-white mb-2">No team members yet</h3>
          <p className="text-gray-400 mb-4">Add your first team member to give them admin access.</p>
          <Button onClick={() => setShowAddModal(true)}>
            <UserPlus className="h-4 w-4 mr-2" />
            Add Team Member
          </Button>
        </Card>
      ) : (
        <div className="grid gap-4">
          {teamMembers.map((member) => (
            <Card key={member.id} className="p-4 sm:p-6">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="flex items-center gap-4 flex-1">
                  <div className="w-12 h-12 bg-brand-emerald-dark rounded-full flex items-center justify-center flex-shrink-0">
                    <span className="text-brand-neon font-bold text-lg">
                      {member.first_name?.[0] || member.email[0].toUpperCase()}
                    </span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-white font-semibold truncate">
                        {member.first_name
                          ? `${member.first_name} ${member.last_name || ''}`
                          : member.email}
                      </h3>
                      <Badge variant="success">
                        <Shield className="h-3 w-3 mr-1" />
                        Admin
                      </Badge>
                      {member.id === currentUser?.id && (
                        <Badge variant="info">You</Badge>
                      )}
                    </div>
                    <p className="text-gray-400 text-sm truncate">{member.email}</p>
                    <p className="text-gray-500 text-xs mt-1">
                      Joined {formatDate(member.created_at)}
                    </p>
                  </div>
                </div>
                {member.id !== currentUser?.id && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handleDemote(member.id, member.email)}
                    isLoading={isProcessing === member.id}
                    className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                  >
                    <ShieldOff className="h-4 w-4 mr-2" />
                    Remove Access
                  </Button>
                )}
              </div>
            </Card>
          ))}
        </div>
      )}

      {/* Add Team Member Modal */}
      {showAddModal && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setShowAddModal(false)}
          />
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
            <Card className="w-full max-w-lg max-h-[80vh] overflow-hidden flex flex-col">
              <div className="p-6 border-b border-brand-gray">
                <h2 className="text-xl font-semibold text-white">Add Team Member</h2>
                <p className="text-gray-400 text-sm mt-1">
                  Search for an existing customer to promote to admin
                </p>
              </div>

              <div className="p-4 border-b border-brand-gray">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <Input
                    type="text"
                    placeholder="Search by name or email..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="pl-10"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-4">
                {promotableUsers.length === 0 ? (
                  <div className="text-center py-8">
                    <Users className="h-10 w-10 text-gray-600 mx-auto mb-3" />
                    <p className="text-gray-400">
                      {search
                        ? 'No customers found matching your search'
                        : 'No customers available to promote'}
                    </p>
                    <p className="text-gray-500 text-sm mt-1">
                      They need to create an account first
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2">
                    {promotableUsers.slice(0, 20).map((user) => (
                      <div
                        key={user.id}
                        className="flex items-center justify-between p-3 rounded-lg hover:bg-brand-gray/30 transition-colors"
                      >
                        <div className="flex items-center gap-3 min-w-0">
                          <div className="w-10 h-10 bg-brand-gray rounded-full flex items-center justify-center flex-shrink-0">
                            <span className="text-gray-300 font-medium">
                              {user.first_name?.[0] || user.email[0].toUpperCase()}
                            </span>
                          </div>
                          <div className="min-w-0">
                            <p className="text-white font-medium truncate">
                              {user.first_name
                                ? `${user.first_name} ${user.last_name || ''}`
                                : 'No name'}
                            </p>
                            <p className="text-gray-400 text-sm truncate">{user.email}</p>
                          </div>
                        </div>
                        <Button
                          size="sm"
                          onClick={() => handlePromote(user.id, user.email)}
                          isLoading={isProcessing === user.id}
                        >
                          <Shield className="h-4 w-4 mr-1" />
                          Make Admin
                        </Button>
                      </div>
                    ))}
                    {promotableUsers.length > 20 && (
                      <p className="text-gray-500 text-sm text-center pt-2">
                        Showing first 20 results. Use search to find more.
                      </p>
                    )}
                  </div>
                )}
              </div>

              <div className="p-4 border-t border-brand-gray">
                <Button
                  variant="outline"
                  className="w-full"
                  onClick={() => {
                    setShowAddModal(false);
                    setSearch('');
                  }}
                >
                  Cancel
                </Button>
              </div>
            </Card>
          </div>
        </>
      )}
    </div>
  );
}
