import { useLocalStorage } from './useLocalStorage';
import { User, UserRole, UserStatus } from '../../../types';
import { authAPI } from '../../../lib/api';

export function useAuth() {
  const [users, setUsers] = useLocalStorage<User[]>('users', []);
  const [currentUser, setCurrentUser] = useLocalStorage<User | null>('current-user', null);
  
  const login = async (email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      const data = await authAPI.login(email, pass);
      
      if (data.access_token) {
        // Store token
        localStorage.setItem('access_token', data.access_token);
        
        // Get user info
        try {
          const userData = await authAPI.getCurrentUser();
          
          const user: User = {
            id: userData.user_id || userData.id,
            name: userData.name,
            email: userData.email,
            role: userData.role === 'admin' ? UserRole.ADMIN : UserRole.USER,
            status: userData.status === 'active' ? UserStatus.ACTIVE : UserStatus.PENDING,
          };
          
          if (user.status !== UserStatus.ACTIVE) {
            localStorage.removeItem('access_token');
            return { success: false, error: 'Dein Konto ist nicht aktiv. Bitte wende dich an einen Administrator.' };
          }
          
          setCurrentUser(user);
          
          // Update users list
          setUsers(prev => {
            const userExists = prev.some(u => u.email === user.email);
            if (userExists) {
              return prev.map(u => u.email === user.email ? user : u);
            }
            return [...prev, user];
          });
          
          return { success: true };
        } catch (error: any) {
          localStorage.removeItem('access_token');
          return { success: false, error: 'Fehler beim Abrufen der Benutzerdaten.' };
        }
      } else {
        return { success: false, error: 'Login fehlgeschlagen. Bitte überprüfe deine Anmeldedaten.' };
      }
    } catch (error: any) {
      console.error('Login error:', error);
      
      // Extract error message
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Login fehlgeschlagen. Bitte überprüfe deine Anmeldedaten.';
      
      return { success: false, error: errorMessage };
    }
  };
  
  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('user');
    setCurrentUser(null);
  };
  
  const register = async (name: string, email: string, pass: string): Promise<{ success: boolean; error?: string }> => {
    try {
      await authAPI.register(email, name, pass);
      return { success: true };
    } catch (error: any) {
      console.error('Register error:', error);
      
      // Extract error message
      const errorMessage = error.response?.data?.detail || 
                          error.response?.data?.message || 
                          error.message || 
                          'Registrierung fehlgeschlagen.';
      
      return { success: false, error: errorMessage };
    }
  };
  
  const updateUser = async (userId: string, updates: Partial<Pick<User, 'role' | 'status'>>): Promise<{ success: boolean; error?: string }> => {
    // This would need to be implemented in the backend
    // For now, just update local state
    setUsers(prev => prev.map(u => (u.id === userId ? { ...u, ...updates } : u)));
    return { success: true };
  };

  const replaceAllUsers = (newUsers: User[]) => {
    setUsers(newUsers);
  };

  return {
    user: currentUser,
    users,
    login,
    logout,
    register,
    updateUser,
    replaceAllUsers,
  };
}

