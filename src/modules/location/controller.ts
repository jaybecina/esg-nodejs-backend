import { Authorized, Get, JsonController, } from 'routing-controllers';
import LocationService from './service';

const path = 'location';

@JsonController()
class LocationController {
    private service: LocationService;

    constructor() {
        this.service = new LocationService();
    }

    @Authorized()
    @Get(`/${path}`)
    async getAll() {
        const result = this.service.getAll();

        return { status: 'success', data: result };
    }
}

export default LocationController;
