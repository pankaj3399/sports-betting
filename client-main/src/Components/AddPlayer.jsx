import React, { useState, useEffect } from 'react'
import { useQuery, useMutation } from '@tanstack/react-query';
import { getActiveClubs } from '../api/Clubs';
import { getPositions } from '../api/Position';
import { getCountries, getNationalTeams } from '../api/Country';
import { savePlayerData } from '../api/Player';
import Loader from './Loader/Loader';
import { Button } from './ui/button';
import { Input } from './ui/input';
import Select from 'react-select';
import { useToast } from '../hooks/use-toast';

const AddPlayer = () => {
    const { toast } = useToast()

    const [player, setPlayer] = useState({
        name: '',
        dateOfBirth: '',
        position: '',
        currentClub: { club: '', from: '' },
        country: '',
        nationalTeams: [{ 
            name: '', 
            from: '', 
            to: '', 
            type: '', 
            teams: [], 
            disabled: true,
            currentlyPlaying: false 
        }],
        previousClubs: [{ name: '', from: '', to: '' }],
        rating: ''
    });

    useEffect(() => {
        // console.log('Current player state:', player);
    }, [player]);

    const { isLoading: clubsDataLoading, data: clubsData = [] } = useQuery({
        queryKey: ['clubs'],
        queryFn: () => getActiveClubs(),
        onSuccess: (data) => console.log('Clubs loaded:', data)
    });

    const { isLoading: positionsDataLoading, data: positionsData = [] } = useQuery({
        queryKey: ['positions'],
        queryFn: () => getPositions(),
        onSuccess: (data) => console.log('Positions loaded:', data)
    });

    const { isLoading: countriesDataLoading, data: countriesData = [] } = useQuery({
        queryKey: ['countries'],
        queryFn: () => getCountries(),
        onSuccess: (data) => console.log('Countries loaded:', data)
    });

    const fetchAllNationalTeams = async (country, index) => {
        // console.log('Fetching teams for country:', country, 'at index:', index);
        try {
            const teams = await getNationalTeams(country);
            // console.log('Teams fetched:', teams);
            const teamsArray = teams.map(team => team.type);
            const updatedArray = [...player.nationalTeams];
            updatedArray[index] = {
                ...updatedArray[index],
                teams: teamsArray,
                disabled: false
            };
            console.log('Updated national teams array:', updatedArray);
            setPlayer(prev => ({
                ...prev,
                nationalTeams: updatedArray
            }));
        } catch (error) {
            console.error('Error fetching national teams:', error);
        }
    };

    const handleAddPreviousClub = () => {
        console.log('Adding new previous club');
        setPlayer(prev => ({
            ...prev,
            previousClubs: [...prev.previousClubs, { name: '', from: '', to: '' }]
        }));
    };

    const handleAddNationalTeam = () => {
        console.log('Adding new national team');
        setPlayer(prev => ({
            ...prev,
            nationalTeams: [...prev.nationalTeams, { 
                name: '', 
                from: '', 
                to: '', 
                type: '', 
                teams: [], 
                disabled: true,
                currentlyPlaying: false 
            }]
        }));
    };

    const handleCurrentlyPlayingChange = (index) => {
        console.log('Toggling currently playing for index:', index);
        const updatedNationalTeams = [...player.nationalTeams];
        updatedNationalTeams[index].currentlyPlaying = !updatedNationalTeams[index].currentlyPlaying;
        
        if (updatedNationalTeams[index].currentlyPlaying) {
            updatedNationalTeams[index].to = '';
        }
        
        setPlayer(prev => ({
            ...prev,
            nationalTeams: updatedNationalTeams
        }));
    };

    const handleInputChange = (e, field, index = null, subfield = null) => {
        console.log('Input change:', { field, index, subfield, value: e.target.value });
        const capitalizeName = (name) => {
            return name
                .split(' ')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ')
                .trim();
        };
    
        const value = field === 'name' ? capitalizeName(e.target.value) : e.target.value;
    
        if (index !== null && subfield) {
            const updatedArray = [...player[field]];
            updatedArray[index][subfield] = value;
            setPlayer(prev => ({
                ...prev,
                [field]: updatedArray
            }));
        } else {
            setPlayer(prev => ({
                ...prev,
                [field]: value
            }));
        }
    };

    const handleClubInputChange = (e, field, subfield) => {
        console.log('Club input change:', { field, subfield, value: e.target.value });
        setPlayer(prev => ({
            ...prev,
            [field]: {
                ...prev[field],
                [subfield]: e.target.value
            }
        }));
    };

    const savePlayerDataMutation = useMutation({
        mutationFn: (playerData) => {
            console.log('Saving player data:', playerData);
            const cleanedData = {
                ...playerData,
                currentClub: playerData.currentClub.club ? playerData.currentClub : null,
                nationalTeams: playerData.nationalTeams
                    .filter(team => team.name && team.type)
                    .map(team => ({
                        ...team,
                        to: team.currentlyPlaying ? null : team.to
                    })),
                previousClubs: playerData.previousClubs.filter(club => club.name)
            };
            return savePlayerData(cleanedData);
        },
        onSuccess: (data) => {
            console.log('Player saved successfully:', data);
            toast({
                description: "Player saved successfully",
            });
            setPlayer({
                name: '',
                dateOfBirth: '',
                position: '',
                currentClub: { club: '', from: '' },
                country: '',
                nationalTeams: [{ 
                    name: '', 
                    from: '', 
                    to: '', 
                    type: '', 
                    teams: [], 
                    disabled: true,
                    currentlyPlaying: false 
                }],
                previousClubs: [{ name: '', from: '', to: '' }],
                rating: ''
            });
        },
        onError: (error) => {
            console.error('Save player error:', error);
            if (error.response?.data?.msg === 'A player with the same name and date of birth already exists') {
                toast({
                    variant: "destructive",
                    title: "Duplicate Player",
                    description: "A player with this name and date of birth already exists",
                });
            } else {
                toast({
                    variant: "destructive",
                    title: "Error",
                    description: error.response?.data?.msg || "Failed to save player",
                });
            }
        }
    });

    const handleSubmit = (e) => {
        e.preventDefault();
        console.log('Submitting form with data:', player);
        savePlayerDataMutation.mutate(player);
    };

    if (clubsDataLoading || positionsDataLoading || countriesDataLoading) {
        return <Loader />;
    }

    return (
        <form onSubmit={handleSubmit} className="mx-10 p-6 bg-white shadow-md rounded-lg space-y-4">
            <div className="flex flex-col">
                <label className="font-semibold text-gray-700">Name:</label>
                <Input
                    type="text"
                    value={player.name}
                    onChange={(e) => handleInputChange(e, 'name')}
                    required
                />
            </div>

            <div className="flex flex-col">
                <label className="font-semibold text-gray-700">Date of Birth:</label>
                <Input
                    type="date"
                    value={player.dateOfBirth}
                    onChange={(e) => handleInputChange(e, 'dateOfBirth')}
                    required
                />
            </div>

            <div className="flex flex-col">
                <label className="font-semibold text-gray-700">Position:</label>
                <Select
                    value={player.position ? {
                        value: player.position,
                        label: positionsData.find(pos => pos._id === player.position)?.position
                    } : null}
                    onChange={(option) => handleInputChange(
                        { target: { value: option.value } },
                        'position'
                    )}
                    options={positionsData.map(pos => ({
                        value: pos._id,
                        label: pos.position
                    }))}
                    className="w-full"
                    placeholder="Select Position"
                />
            </div>

            <div className="flex flex-col">
                <label className="font-semibold text-gray-700">Current Club:</label>
                <Select
                    value={player.currentClub.club ? {
                        value: player.currentClub.club,
                        label: clubsData.find(club => club._id === player.currentClub.club)?.name
                    } : null}
                    onChange={(option) => handleClubInputChange(
                        { target: { value: option.value } },
                        'currentClub',
                        'club'
                    )}
                    options={clubsData.map(club => ({
                        value: club._id,
                        label: club.name
                    }))}
                    className="w-full"
                    placeholder="Select Club"
                />

                <label className="font-semibold text-gray-700 mt-2">From:</label>
                <Input
                    type="date"
                    value={player.currentClub.from}
                    onChange={(e) => handleClubInputChange(e, 'currentClub', 'from')}
                />
            </div>

            <div className="flex flex-col">
                <label className="font-semibold text-gray-700">Country:</label>
                <Select
                    value={player.country ? { 
                        value: player.country,
                        label: player.country
                    } : null}
                    onChange={(option) => handleInputChange(
                        { target: { value: option.value } },
                        'country'
                    )}
                    options={countriesData.map(country => ({
                        label: typeof country === 'string' ? country : country.country,
                        value: typeof country === 'string' ? country : country.country
                    }))}
                    className="w-full"
                    placeholder="Select Country"
                    required
                />
            </div>

            <div>
                <label className="font-semibold text-gray-700">National Teams:</label>
                {player.nationalTeams.map((team, index) => (
                    <div key={index} className="space-y-2 mb-4 p-4 border rounded-lg bg-gray-50">
                        <div className="flex items-center space-x-2 mb-2">
                            <Select
                                value={team.name ? { 
                                    value: team.name,
                                    label: team.name 
                                } : null}
                                onChange={(option) => {
                                    handleInputChange(
                                        { target: { value: option.value } },
                                        'nationalTeams',
                                        index,
                                        'name'
                                    );
                                    fetchAllNationalTeams(option.value, index);
                                }}
                                options={countriesData.map(country => ({
                                    label: typeof country === 'string' ? country : country.country,
                                    value: typeof country === 'string' ? country : country.country
                                }))}
                                className="w-full"
                                placeholder="Select National Team"
                            />
                            
                            <Select
                                value={team.type ? { 
                                    value: team.type,
                                    label: team.type 
                                } : null}
                                onChange={(option) => handleInputChange(
                                    { target: { value: option.value } },
                                    'nationalTeams',
                                    index,
                                    'type'
                                )}
                                options={team.teams.map(type => ({
                                    value: type,
                                    label: type
                                }))}
                                isDisabled={team.disabled}
                                placeholder="Select Team Type"
                                className="w-full"
                            />
                        </div>

                        <div className="flex flex-wrap items-center gap-4">
                            <div className="flex items-center space-x-2">
                                <label className="font-semibold text-gray-700">From:</label>
                                <Input
                                    type="date"
                                    value={team.from}
                                    onChange={(e) => handleInputChange(e, 'nationalTeams', index, 'from')}
                                />
                            </div>

                            {!team.currentlyPlaying && (
                                <div className="flex items-center space-x-2">
                                    <label className="font-semibold text-gray-700">To:</label>
                                    <Input
                                        type="date"
                                        value={team.to}
                                        onChange={(e) => handleInputChange(e, 'nationalTeams', index, 'to')}
                                    />
                                </div>
                            )}

                            <div className="flex items-center space-x-2">
                                <input
                                    type="checkbox"
                                    id={`currently-playing-${index}`}
                                    checked={team.currentlyPlaying}
                                    onChange={() => handleCurrentlyPlayingChange(index)}
                                    className="w-4 h-4 text-blue-600 bg-gray-100 border-gray-300 rounded"
                                />
                                <label htmlFor={`currently-playing-${index}`}>
                                    Currently Playing
                                </label>
                            </div>
                        </div>
                    </div>
                ))}
                <Button
                    type="button"
                    onClick={handleAddNationalTeam}
                >
                    Add National Team
                </Button>
            </div>

            <div>
                <label className="font-semibold text-gray-700">Previous Clubs:</label>
                {player.previousClubs.map((club, index) => (
                    <div key={index} className="flex items-center space-x-2 mb-2">
                        <Select
                            value={club.name ? {
                                value: club.name,
                                label: clubsData.find(c => c._id === club.name)?.name
                            } : null}
                            onChange={(option) => handleInputChange(
                                { target: { value: option.value } },
                                'previousClubs',
                                index,
                                'name'
                            )}
                            options={clubsData.map(c => ({
                                value: c._id,
                                label: c.name
                            }))}
                           className="w-full"
                            placeholder="Select Club"
                        />

                        <label className="font-semibold text-gray-700">From:</label>
                        <Input
                            type="date"
                            value={club.from}
                            onChange={(e) => handleInputChange(e, 'previousClubs', index, 'from')}
                            className="border border-gray-300 p-2 rounded-lg"
                        />
                        <label className="font-semibold text-gray-700">To:</label>
                        <Input
                            type="date"
                            value={club.to}
                            onChange={(e) => handleInputChange(e, 'previousClubs', index, 'to')}
                            className="border border-gray-300 p-2 rounded-lg"
                        />
                    </div>
                ))}
                <Button
                    type="button"
                    onClick={handleAddPreviousClub}
                    className="mt-2"
                >
                    Add Previous Club
                </Button>
            </div>

            <Button
                type="submit"
                className="w-full"
                variant="yellow"
            >
                Save Player
            </Button>

            {savePlayerDataMutation.isPending && <div>Saving player...</div>}
        </form>
    );
};

export default AddPlayer;