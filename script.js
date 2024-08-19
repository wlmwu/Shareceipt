class Friend {
    static nextId = 1;

    constructor(name) {
        this.id = Friend.nextId++;
        this.name = name;
        this.rgb = this.generateRandomRgb();
    }
    
    generateRandomRgb() {
        // Helper function to generate a random integer between min and max
        const getRandomIntInRange = (min, max) => Math.floor(Math.random() * (max - min + 1)) + min;

        const values = [
            getRandomIntInRange(100, 240),
            getRandomIntInRange(getRandomIntInRange(50, 70), getRandomIntInRange(140, 240)),
        ];
        values.push(700 - values[0] - values[1]);
        values.sort(() => Math.random() - 0.5);

        return { r: values[0], g: values[1], b: values[2] };
    }

    get rgbString() {
        return `rgb(${this.rgb.r}, ${this.rgb.g}, ${this.rgb.b})`;
    }
}

class Item {
    static nextId = 1;
    
    constructor(name = '', amount) {
        this.id = Item.nextId++;
        this.name = name;
        this.amount = parseFloat(amount);
        this.participants = new Map(); // Map of Friend ID to percentage
        this.isUnitPercentage = true;
    }

    setParticipant(friendId, percentage, checked=true) {
        // console.log('set participant', this.id, friendId, percentage);
        if (!Number.isInteger(friendId)) return;
        if (percentage === undefined) percentage = NaN;

        this.participants.set(friendId, { percentage: parseFloat(percentage), checked: checked });
    }

    removeParticipant(friendId) {
        // console.log('rmv participant', this.id, friendId);
        if (!Number.isInteger(friendId)) return;
        this.participants.delete(friendId);
    }

    getParticipantPercentage(friendId) {
        const res = this.participants.get(friendId);
        if (res) return res.percentage;
        else return res;
    }

    getTotalPercentage() {
        return Array.from(this.participants.values()).map(p => p.percentage).reduce((accumulator, currentValue) => {
            return !isNaN(currentValue) ? accumulator + currentValue : accumulator;
        }, 0);
    }

    getParticipantChecked(friendId) {
        const res = this.participants.get(friendId);
        if (res) return res.checked;
        else return res;
    }

    setUnitType() {
        this.isUnitPercentage = !this.isUnitPercentage;
    }

    getUnitType() {
        return this.isUnitPercentage;
    }

}

class FriendManager {
    constructor() {
        this.friends = new Map();
        this.items = new Map();
        this.friendListElement = $('#friends-list');
        this.itemsListElement = $('#items-list');
        this.initializeFriends();
        this.attachEventListeners();
    }

    initializeFriends() {
        this.friendListElement.empty();
        this.addFriend('Friend 1');
    }

    addFriend(name) {
        const friend = new Friend(name);
        this.friends.set(friend.id, friend);
        this.updateFriendList();
    }

    removeFriend(id) {
        this.friends.delete(id);
        this.updateFriendList();
    }

    updateFriendList() {
        const existingFriendIds = new Set(this.friends.keys());
        this.friendListElement.children('.friend').each((_, div) => {
            const id = parseInt($(div).find('.friend-name').data('id'), 10);
            if (!existingFriendIds.has(id)) {
                $(div).remove();
            }
        });

        this.friends.forEach(friend => {
            let friendElement = this.friendListElement.find(`.friend-name[data-id="${friend.id}"]`);
            if (!friendElement.length) {
                this.friendListElement.append(`
                    <div class="friend">
                        <span class="friend-name" data-id="${friend.id}" style="background-color: ${friend.rgbString}">${friend.name}</span>
                        <button class="delete-btn" data-id="${friend.id}">✖</button>
                    </div>
                `);
            } else {
                friendElement[0].innerHTML = friend.name;
            }
        });

        this.bindFriendEvents();
        this.updateItemFriends();
    }

    updateItemFriends() {
        const numFriends = this.friends.size;

        this.itemsListElement.find('.item').each((index, itemDiv) => {
            const itemId = parseInt($(itemDiv).find('input[type="text"]').attr('id').split('-').pop());
            let item = this.items.get(itemId);

            const itemFriendsDiv = $(`#item-friends-${itemId}`);

            // remove friends removed
            const existingFriendIds = new Set(this.friends.keys());
            itemFriendsDiv.children('.item-friend').each((_, div) => {
                let friendId = parseInt($(div).find('label').attr('for').split('-')[3]);
                if (!existingFriendIds.has(friendId)) {
                    $(div).remove();
                    item.removeParticipant(friendId);
                }
            });

            // add friends added
            this.friends.forEach(friend => {
                if (!itemFriendsDiv.find(`.item-friend input[id="item-${itemId}-friend-${friend.id}"]`).length) {
                    itemFriendsDiv.append(`
                        <div class="item-friend">
                            <input type="checkbox" id="item-${itemId}-friend-${friend.id}" checked>
                            <label for="item-${itemId}-friend-${friend.id}" class="item-friend-name" style="background-color: ${friend.rgbString}" >
                            </label>
                        </div>
                    `);
                }
            });

            itemFriendsDiv.children('.item-friend').each((_, div) => {
                let itemId = parseInt($(div).find('label').attr('for').split('-')[1]);
                let friendId = parseInt($(div).find('label').attr('for').split('-')[3]);
                let item = this.items.get(itemId)
                const percentage = item.getParticipantPercentage(friendId);
                let friend = this.friends.get(friendId);

                $($(div).find('label')).html( `
                    <div class="text-center align-middle">
                        <div class="d-block d-sm-inline">${friend.name}</div>
                        <div class="d-inline">
                            <input type="number" value="${percentage}" min="0" max="100" step="0.01" class="percentage-input"> %
                        </div>
                    </div>
                `);
                // $(div).find('input[type="number"]')[0].placeholder = Math.round(100 / numFriends * 100) / 100;
                item.setParticipant(friendId, percentage, percentage === undefined ? true : item.getParticipantChecked(friendId));
                this.bindItemEvents();
            });
        });
        this.calculate();
    }

    addItem(name = '', amount) {
        const item = new Item(name, amount);
        this.items.set(item.id, item)
        this.updateItemsList();
    }

    removeItem(id) {
        this.items.delete(id);
        this.updateItemsList();
    }

    updateItemsList() {
        const existingItems = new Set(this.items.keys());
        this.itemsListElement.children('.item').each((_, div) => {
            const id = parseInt($(div).data('id'), 10);
            if (!existingItems.has(id)) {
                $(div).remove();
            }
        });
        
        let index = 1;
        this.items.forEach((item, key) => {
            let itemElement = this.itemsListElement.find(`.item[data-id="${item.id}"]`);
            if (!itemElement.length) {
                this.itemsListElement.append(`
                    <div class="item m-sm-3 p-sm-2"  data-id="${item.id}">
                        <button class="collapse-btn" data-bs-toggle="collapse" data-bs-target="#item-container-${item.id}" aria-expanded="true" aria-controls="item-container-${item.id}">
                            ▬
                        </button>
                        <button class="delete-btn">✖</button>
                        <div class="item-container collapse show" id="item-container-${item.id}">
                            <label for="item-name-${item.id}">項目 ${index} 名稱:</label>
                            <input type="text" id="item-name-${item.id}" value="${item.name}">
                            <label for="item-amount-${item.id}">金額:</label>
                            <input type="number" id="item-amount-${item.id}" min="0" step="0.01" value="${item.amount}">
                            <button class="distribute-btn">Distribute Evenly</button>
                            <label for="item-friends-${item.id}"></label>
                            <div id="item-friends-${item.id}" class="item-friends"></div>
                        </div>
                    </div>
                `);
            } else {
                $($(itemElement).find('label')[0]).html(`項目 ${index} 名稱:`);
            }
            index++;
        });
        this.updateItemFriends();
    }

    bindFriendEvents() {
        this.friendListElement.off('click', '.delete-btn').on('click', '.delete-btn', (event) => {
            const id = $(event.currentTarget).data('id');
            this.removeFriend(id);
        });
        this.friendListElement.off('click', '.friend-name').on('click', '.friend-name', (event) => {
            const id = $(event.currentTarget).data('id');
            this.editName(id);
        });
    }

    bindItemEvents() {
        $('#items-list .item .delete-btn').off('click').on('click', (e) => {
            const itemId = parseInt($(e.target).closest('.item').data('id'));
            this.removeItem(itemId);
        });

        $('#items-list .item .item-container').off('hide.bs.collapse').on('hide.bs.collapse', (e) => {
            const collapseBtn = $(e.target).closest('.item').find('.collapse-btn');
            $(collapseBtn).html(`✚`);
        });
        
        $('#items-list .item .item-container').off('show.bs.collapse').on('show.bs.collapse', (e) => {
            const collapseBtn = $(e.target).closest('.item').find('.collapse-btn');
            $(collapseBtn).html( `▬` );
        });

        $('#items-list .item .distribute-btn').off('click').on('click', (e) => {
            const itemId = parseInt($(e.target).closest('.item').data('id'));
            this.autoDistribute(itemId);
        });

        $('#items-list .item .unit-btn').off('click').on('click', (e) => {
            const itemId = parseInt($(e.target).closest('.item').data('id'));
            this.switchUnit(itemId);
        });

        $('#items-list .item-friends input[type="number"]').off('focus').on('focus', (e) => {
            const itemId = parseInt($(e.target.closest('label')).attr('for').split('-')[1]);
            const friendId = parseInt($(e.target.closest('label')).attr('for').split('-')[3]);
            $(e.target).val('');

            this.items.get(itemId).setParticipant(friendId, NaN);
            this.calculate();
        });

        $('#items-list input[type="number"]').off('input').on('input', (e) => {
            const itemId = parseInt(e.target.id.split('-')[2]);
            this.items.get(itemId).amount = parseFloat(e.target.value);
            this.calculate();
        });

        $('#items-list .item-friends input[type="checkbox"]').off('change').on('change', function(e) {
            const itemId = parseInt(e.target.id.split('-')[1]);
            const friendId = parseInt(e.target.id.split('-')[3]);
            const check = $(`#${e.target.id}`)[0].checked;
            const input = $(`#${e.target.id}`).closest('.item-friend').find('.percentage-input')[0];
            input.disabled = !check;
            input.value = check ? NaN : 0 ;
            this.items.get(itemId).setParticipant(friendId, input.value, check);
            this.calculate();
        }.bind(this));

        $('#items-list .item-friends .percentage-input').off('input').on('input', function(e) {
            const itemId = parseInt($(e.target).closest('label').attr('for').split('-')[1]);
            const friendId = parseInt($(e.target).closest('label').attr('for').split('-')[3]);
            const input = parseFloat(e.target.value);
            this.items.get(itemId).setParticipant(friendId, input);
            this.calculate();
        }.bind(this));

        $('#total-amount').off('input').on('input', () => this.calculate());
    }

    calculate() {
        let totalAmount = parseFloat($('#total-amount').val());
        let amountOfItems = Array.from(this.items.values()).map(item => item.amount);
        totalAmount = totalAmount ? totalAmount : 
            amountOfItems.reduce((accumulator, currentValue) => {
            return !isNaN(currentValue) ? accumulator + currentValue : accumulator;
        }, 0);
        
        let results = new Map(
            Array.from(this.friends, ([key, obj]) => [key, 0])
        );

        $('#results-alert').html('');
        this.items.forEach((item, iid) => {
            const totalPercentage = item.getTotalPercentage();
            if (item.amount && totalPercentage != 100) {
                $('#results-alert').html('Warning: some items do not sum to 100%');
                return;
            }
            if (!item.amount) return;
            item.participants.forEach((_, fid) => {
                if (item.getParticipantChecked(fid)) {
                    const percentage = item.getParticipantPercentage(fid) || 0;
                    const amount = item.amount * percentage / 100 + results.get(fid);
                    results.set(fid, amount);
                }
            });
            
        });

        // console.log(totalAmount, results);
        this.showResult(totalAmount, results);
    }

    showResult(totalAmount, results) {
        const resultTotal = Array.from(results.values()).reduce((accumulator, currentValue) => accumulator + currentValue, 0);

        const resultsOutput = $('#results-output');
        resultsOutput.html('');
        this.friends.forEach((friend, fid) => {
            const totalAmountOwed = totalAmount * results.get(fid) / resultTotal;
            resultsOutput.append(`
                <div class="">
                    <span class="result-output-friend friend-name" style="background-color:${friend.rgbString}">${friend.name}:&emsp;$${isNaN(totalAmountOwed) ? 0 : totalAmountOwed.toFixed(2)}</span>
                </div>
                `);
        });
    }

    autoDistribute(itemId) {
        let item = this.items.get(itemId);
        const remainPercentage = 100 - item.getTotalPercentage();
        const countNaN = Array.from(item.participants.values())
                            .map(p => p.percentage)
                            .reduce((accumulator, currentValue) => accumulator + (isNaN(currentValue) ? 1 : 0), 0);
        
        item.participants.forEach((_, id) => {
            if (item.getParticipantChecked(id) && isNaN(item.getParticipantPercentage(id))) {
                item.setParticipant(id, remainPercentage/countNaN);
            }
        });
        this.updateItemFriends();
    }

    switchUnit(itemId) {
        this.items.get(itemId).setUnitType();
        this.updateItemsList();
    }

    attachEventListeners() {
        $('#add-friend').on('click', () => {
            this.addFriend(`Friend ${Friend.nextId}`);
        });

        $('#add-item').on('click', () => {
            this.addItem();
        });
    }

    editName(id) {
        const friend = this.friends.get(id);
        if (friend) {
            const newName = prompt('請輸入新的名稱:', friend.name);
            if (newName) {
                friend.name = newName;
                this.updateFriendList();
            }
        }
        console.log(friend);
    }
}


// Initialize the friend manager when the document is ready
const friendManager = new FriendManager();
