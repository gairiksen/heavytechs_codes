import apiFetch from './apiFetch'

const saveAvailability = (event) => {
    const available = document.querySelector('input[id="available"]:checked');
    const unavailable = document.querySelector('input[id="unavailable"]:checked');
    if(available != null){
        return apiFetch('/api/save-availability', {
            body: JSON.stringify({ details: { availability: '1' } })
        });
    }

    if(unavailable != null){
        return apiFetch('/api/save-availability', {
            body: JSON.stringify({ details: { availability: '0' } })
        });
    }
    
};

const availability = document.querySelectorAll('.mechanic_availability');
availability.forEach((avail)=> {
    avail.onclick = saveAvailability
});