import { useState, useEffect, useMemo, useCallback } from "react"
import { Agent } from "@/types"
import { API_BASE_URL } from "@/lib/config"
import Cookies from "js-cookie"

export function useAgents() {
    const [agents, setAgents] = useState<Agent[]>([])
    const [loading, setLoading] = useState(true)
    const [searchQuery, setSearchQuery] = useState("")
    const [sortBy, setSortBy] = useState("name")
    const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc')

    const fetchAgents = useCallback(async () => {
        setLoading(true)
        try {
            const token = Cookies.get('auth_token')
            const response = await fetch(`${API_BASE_URL}/agents`, {
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (response.ok) {
                const data = await response.json();
                setAgents(data);
            }
        } catch (error) {
            console.error('Failed to fetch agents:', error);
        } finally {
            setLoading(false)
        }
    }, [])

    useEffect(() => {
        fetchAgents()
    }, [fetchAgents])

    const filteredAgents = useMemo(() => {
        return agents
            .filter(agent => {
                const searchLower = searchQuery.toLowerCase()
                return (
                    agent.name.toLowerCase().includes(searchLower) ||
                    agent.type.toLowerCase().includes(searchLower) ||
                    agent.id.toLowerCase().includes(searchLower)
                )
            })
            .sort((a, b) => {
                let comparison = 0;
                if (sortBy === 'name') comparison = a.name.localeCompare(b.name);
                else if (sortBy === 'priority') comparison = Number(a.priority) - Number(b.priority);
                else if (sortBy === 'status') comparison = a.status.localeCompare(b.status);
                else if (sortBy === 'type') comparison = a.type.localeCompare(b.type);

                return sortOrder === 'asc' ? comparison : -comparison;
            });
    }, [agents, searchQuery, sortBy, sortOrder]);

    const toggleSort = (key: string) => {
        if (sortBy === key) {
            setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
        } else {
            setSortBy(key);
            setSortOrder('asc');
        }
    };

    const deleteAgent = async (id: string) => {
        try {
            const token = Cookies.get('auth_token')
            const response = await fetch(`${API_BASE_URL}/agents/${id}`, {
                method: 'DELETE',
                headers: token ? { 'Authorization': `Bearer ${token}` } : {}
            });
            if (response.ok) {
                fetchAgents()
                return true
            }
        } catch (error) {
            console.error('Delete failed:', error)
        }
        return false
    }

    const updateAgent = async (id: string, values: Partial<Agent>) => {
        try {
            const token = Cookies.get('auth_token')
            const response = await fetch(`${API_BASE_URL}/agents/${id}`, {
                method: 'PATCH',
                headers: {
                    'Content-Type': 'application/json',
                    ...(token ? { 'Authorization': `Bearer ${token}` } : {})
                },
                body: JSON.stringify(values)
            });
            if (response.ok) {
                fetchAgents()
                return true
            }
        } catch (error) {
            console.error('Update failed:', error)
        }
        return false
    }

    return {
        agents,
        loading,
        searchQuery,
        setSearchQuery,
        sortBy,
        sortOrder,
        filteredAgents,
        toggleSort,
        fetchAgents,
        deleteAgent,
        updateAgent
    }
}
